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

/* ── Character sanitization map ────────────────────────────── */
/**
 * Maps emoji / non-keyboard characters to ASCII keyboard equivalents.
 * This ensures users never get stuck on a character they cannot type.
 */
const CHAR_REPLACEMENTS = [
  // Common emoji used in code/docs
  [/[\u{1F310}\u{1F30D}\u{1F30E}\u{1F30F}]/gu, '[globe]'],
  [/[\u{1F4BB}\u{1F5A5}\u{1F4F1}\u{1F4F2}]/gu, '[screen]'],
  [/[\u{1F6E0}\u{1F527}\u{2699}\u{FE0F}]/gu,   '[tool]'],
  [/[\u{1F512}\u{1F513}\u{1F510}]/gu,           '[lock]'],
  [/[\u{1F916}]/gu,                              '[bot]'],
  [/[\u{1F3AE}\u{1F579}]/gu,                    '[game]'],
  [/[\u{1F4E6}\u{1F4C1}\u{1F4C2}]/gu,          '[pkg]'],
  [/[\u{2705}\u{2714}]/gu,                       '[ok]'],
  [/[\u{274C}\u{2716}]/gu,                       '[x]'],
  [/[\u{26A0}\u{FE0F}\u{26A0}]/gu,             '[!]'],
  [/[\u{2139}\u{FE0F}]/gu,                       '[i]'],
  [/[\u{1F4A1}]/gu,                              '[idea]'],
  [/[\u{1F525}]/gu,                              '[fire]'],
  [/[\u{2B50}\u{1F31F}]/gu,                     '[star]'],
  [/[\u{27A1}\u{FE0F}\u{25B6}\u{FE0F}]/gu,    '->'],
  [/[\u{2190}\u{2B05}\u{FE0F}]/gu,              '<-'],
  [/\u{2026}/gu,                                 '...'],
  [/[\u{2018}\u{2019}]/gu,                       "'"],   // curly single quotes
  [/[\u{201C}\u{201D}]/gu,                       '"'],   // curly double quotes
  [/[\u{2013}]/gu,                               '-'],   // en dash
  [/[\u{2014}]/gu,                               '--'],  // em dash
  [/[\u{00A0}]/gu,                               ' '],   // non-breaking space
  [/[\u{2022}]/gu,                               '*'],   // bullet
  [/[\u{00B7}]/gu,                               '.'],   // middle dot
  [/[\u{00D7}]/gu,                               'x'],   // multiplication sign
  [/[\u{00F7}]/gu,                               '/'],   // division sign
  [/[\u{2260}]/gu,                               '!='],  // not-equal
  [/[\u{2264}]/gu,                               '<='],  // less-or-equal
  [/[\u{2265}]/gu,                               '>='],  // greater-or-equal
  [/[\u{221E}]/gu,                               'inf'], // infinity
  [/[\u{03B1}]/gu,                               'alpha'],
  [/[\u{03B2}]/gu,                               'beta'],
  [/[\u{03B3}]/gu,                               'gamma'],
  [/[\u{03BB}]/gu,                               'lambda'],
  [/[\u{03C0}]/gu,                               'pi'],
  [/[\u{03A3}]/gu,                               'Sigma'],
  [/[\u{2211}]/gu,                               'sum'],
  [/[\u{221A}]/gu,                               'sqrt'],
];

/**
 * Replace any character outside the standard keyboard range with a
 * typeable ASCII alternative.  Called as part of normalizeContent().
 *
 * Strategy:
 *  1. Apply known emoji / special char → ASCII substitution map.
 *  2. For any remaining characters with code-point > 126 (outside
 *     printable ASCII) that are NOT newline (10) or horizontal tab (9),
 *     replace with '?' so the user can always type it.
 */
function sanitizeForTyping(s) {
  // Apply the known replacements table first
  for (const [pattern, replacement] of CHAR_REPLACEMENTS) {
    s = s.replace(pattern, replacement);
  }

  // Fallback: strip any remaining non-printable-ASCII
  // Keep: 0x09 (tab), 0x0A (newline), 0x20-0x7E (printable ASCII)
  s = s.replace(/[^\x09\x0A\x20-\x7E]/g, '?');

  return s;
}


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

  return normalizeContent(text, path);
}

/**
 * Normalize raw file content for the typing engine:
 *  - Unify line endings to \n
 *  - Sanitize non-keyboard characters (emoji, unicode) to ASCII
 *  - Expand tabs to 4 spaces (consistent for typing)
 *  - For .md files: strip ## heading lines and blank description lines
 *    (README intro is shown separately, not typed)
 *  - Strip trailing whitespace per line
 *  - Ensure exactly one trailing newline
 *
 * @param {string} raw   - raw file text
 * @param {string} [filePath] - optional file path, used to detect .md files
 */
function normalizeContent(raw, filePath = '') {
  let s = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Sanitize emoji and non-keyboard Unicode to typeable ASCII
  s = sanitizeForTyping(s);

  // For markdown files: strip heading lines (# / ##) and separator lines
  // so users only type actual code/prose content, not markdown structure.
  const isMd = /\.mdx?$/i.test(filePath);
  if (isMd) {
    s = s
      .split('\n')
      .filter(line => {
        const t = line.trim();
        // Skip markdown headings (# Heading, ## Sub, etc.)
        if (/^#{1,6}\s/.test(t)) return false;
        // Skip horizontal rules
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) return false;
        // Skip badge lines (common in READMEs): [![...](...)](...)  or  ![...](...)
        if (/^!?\[/.test(t) && /\]\(/.test(t)) return false;
        return true;
      })
      .join('\n');
  }

  // Expand tabs -> 4 spaces
  s = s.replace(/\t/g, '    ');

  // Strip trailing whitespace per line
  s = s.split('\n').map(line => line.trimEnd()).join('\n');

  // Remove sequences of more than 2 blank lines (trim padding)
  s = s.replace(/\n{3,}/g, '\n\n');

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
