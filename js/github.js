/**
 * GhostCode AI — GitHub API Integration
 *
 * Strategy:
 *  - File tree:    github.com API  (1 call/track, uses rate limit)
 *  - File content: raw.githubusercontent.com CDN (unlimited, no auth needed)
 *
 * Public repos: 60 tree API calls/hr unauthenticated, 5000/hr with token.
 * Content fetches via raw CDN do not consume the API rate limit.
 */

const GH_API = 'https://api.github.com';
const GH_RAW = 'https://raw.githubusercontent.com';

/* ── File types to INCLUDE ──────────────────────────────────── */
const CODE_EXTS = new Set([
  '.js', '.mjs', '.cjs', '.jsx',
  '.ts', '.tsx',
  '.py', '.pyw',
  '.html', '.htm',
  '.css', '.scss', '.sass', '.less',
  '.go',
  '.java', '.kt', '.kts', '.groovy',
  '.rs',
  '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',
  '.php',
  '.rb',
  '.swift',
  '.sh', '.bash', '.zsh', '.fish', '.ps1',
  '.yml', '.yaml',
  '.toml',
  '.json',
  '.md', '.mdx',
  '.vue',
  '.svelte',
  '.graphql', '.gql',
  '.sql',
  '.r',
  '.xml',
  '.gradle',
  '.env',
  '.gitignore',
]);

/* Extensionless filenames that are known code/config files */
const CODE_BASENAMES = new Set([
  'makefile', 'dockerfile', 'gemfile', 'rakefile',
  'procfile', 'vagrantfile', 'brewfile', 'jakefile',
  '.editorconfig', '.eslintrc', '.prettierrc',
  '.babelrc', '.nvmrc', '.node-version',
]);

/* ── Patterns to SKIP ──────────────────────────────────────── */
const SKIP_RE = [
  /node_modules\//i,
  /\.min\.(js|css)$/i,
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
  /composer\.lock$/i,
  /Gemfile\.lock$/i,
  /(^|\/)dist\//i,
  /(^|\/)build\//i,
  /(^|\/)\.next\//i,
  /(^|\/)\.git\//i,
  /(^|\/)__pycache__\//i,
  /(^|\/)\.venv\//i,
  /(^|\/)venv\//i,
  /(^|\/)coverage\//i,
  /\.(png|jpe?g|gif|svg|ico|webp|bmp|tiff|avif)$/i,
  /\.(mp4|mov|avi|mkv|webm|mp3|wav|ogg|flac)$/i,
  /\.(woff2?|ttf|eot|otf)$/i,
  /\.(pdf|zip|tar|gz|bz2|7z|rar|bin|exe|dll|so|a|class|pyc|pyd)$/i,
  /\.(ipynb)$/i,    // Jupyter notebooks (JSON, hard to type)
  /\.DS_Store$/i,
];

/* Max file size we'll fetch (bytes). Larger files are auto-skipped. */
const MAX_FILE_BYTES = 150_000;

/* ── Helpers ────────────────────────────────────────────────── */
function buildHeaders(token) {
  const h = { 'Accept': 'application/vnd.github.v3+json' };
  if (token) h['Authorization'] = `token ${token}`;
  return h;
}

function isCodeFile(path, sizeBytes) {
  // Size guard
  if (sizeBytes !== undefined && sizeBytes > MAX_FILE_BYTES) return false;

  const lower = path.toLowerCase();

  // Skip patterns
  if (SKIP_RE.some(re => re.test(lower))) return false;

  const parts = lower.split('/');
  const basename = parts[parts.length - 1];

  // Known extensionless code files
  if (CODE_BASENAMES.has(basename)) return true;

  // Extension check
  const dotIdx = basename.lastIndexOf('.');
  if (dotIdx === -1) return false;           // no extension, unknown — skip
  const ext = basename.slice(dotIdx);        // includes the dot
  return CODE_EXTS.has(ext);
}

/* ── Core API Functions ─────────────────────────────────────── */

/**
 * Fetch the recursive file tree for a repo.
 * Tries 'main' then 'master' (or the caller-supplied branch first).
 *
 * @returns {{ files: string[], branch: string }}
 */
async function fetchFileTree(owner, repo, token = null, hintBranch = null) {
  const tryCandidates = hintBranch
    ? [hintBranch, hintBranch === 'main' ? 'master' : 'main']
    : ['main', 'master'];

  let lastError = null;

  for (const branch of tryCandidates) {
    try {
      const url = `${GH_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
      const res = await fetch(url, { headers: buildHeaders(token) });

      if (res.status === 404) continue;   // branch doesn't exist
      if (res.status === 403 || res.status === 429) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          `GitHub rate limit hit. Add a Personal Access Token for higher limits.\n${data.message || ''}`
        );
      }
      if (!res.ok) {
        throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (data.truncated) {
        console.warn('[GhostCode] Repository tree was truncated by GitHub API — very large repo.');
      }

      const files = (data.tree || [])
        .filter(item => item.type === 'blob')
        .filter(item => isCodeFile(item.path, item.size))
        .map(item => item.path)
        .sort();   // alphabetical → deterministic progression

      return { files, branch };

    } catch (err) {
      if (err.message.includes('rate limit')) throw err;  // propagate immediately
      lastError = err;
      // try next branch
    }
  }

  throw lastError || new Error(`Could not find repository "${owner}/${repo}". Check the URL and try again.`);
}

/**
 * Fetch the raw text content of a single file.
 * Uses raw.githubusercontent.com CDN (no API quota consumed).
 *
 * @returns {string} normalized file content
 */
async function fetchFileContent(owner, repo, branch, path, token = null) {
  const url = `${GH_RAW}/${owner}/${repo}/${branch}/${encodeURIComponent(path).replace(/%2F/g, '/')}`;

  const headers = {};
  if (token) headers['Authorization'] = `token ${token}`;

  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`Failed to load "${path}" (HTTP ${res.status})`);
  }

  const text = await res.text();

  // Check for binary content (null bytes)
  if (text.includes('\x00')) {
    throw new Error(`"${path}" appears to be a binary file`);
  }

  return normalizeContent(text);
}

/**
 * Normalize raw file content for the typing engine:
 *  - Unify line endings to \n
 *  - Expand tabs to 4 spaces (consistent for typing)
 *  - Strip trailing whitespace per line
 *  - Ensure exactly one trailing newline
 */
function normalizeContent(raw) {
  let s = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Expand tabs → 4 spaces
  s = s.replace(/\t/g, '    ');

  // Strip trailing whitespace per line
  s = s.split('\n').map(line => line.trimEnd()).join('\n');

  // Single trailing newline
  s = s.trimEnd() + '\n';

  return s;
}

/**
 * Parse a GitHub repo URL or short "owner/repo" string.
 *
 * Accepts:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/tree/branch
 *   github.com/owner/repo
 *   owner/repo
 *
 * @returns {{ owner: string, repo: string } | null}
 */
function parseRepoUrl(raw) {
  const s = (raw || '').trim();

  // Full URL forms
  const urlMatch = s.match(/github\.com\/([^\/\s]+)\/([^\/\s#?]+)/);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo:  urlMatch[2].replace(/\.git$/, ''),
    };
  }

  // Short form: owner/repo
  const shortMatch = s.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  return null;
}
