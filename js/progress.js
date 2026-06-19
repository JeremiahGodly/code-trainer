/**
 * GhostCode AI — Progress Persistence
 *
 * All progress is stored in localStorage under a versioned key.
 * No backend required.
 *
 * Schema (localStorage key: 'ghostcode_v1'):
 * {
 *   tracks: {
 *     [trackId]: {
 *       owner:            string,
 *       repo:             string,
 *       branch:           string,
 *       files:            Array<{ path, completed, accuracy, wpm, chars }>,
 *       currentFileIndex: number,   // next file to type
 *       totalChars:       number,   // chars typed across all completed files
 *       totalErrors:      number,
 *       totalKeystrokes:  number,
 *       startedAt:        number,   // timestamp
 *     }
 *   }
 * }
 *
 * Custom repo overrides are stored separately:
 *   'ghostcode_repo_{trackId}' → { owner, repo }
 */

const STORAGE_KEY = 'ghostcode_v1';

/* ── Internal helpers ───────────────────────────────────────── */

function _read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { tracks: {} };
  } catch {
    return { tracks: {} };
  }
}

function _write(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[GhostCode] Failed to save progress:', e);
  }
}

/* ── Track Progress ─────────────────────────────────────────── */

/**
 * Load existing track progress or create a fresh entry.
 * If the same track has been started with a different repo, or the
 * file list changed, it resets to a fresh start.
 *
 * @returns {object} track progress object
 */
function loadOrInitTrack(trackId, owner, repo, branch, files) {
  const data     = _read();
  const existing = data.tracks[trackId];

  const sameRepo  = existing && existing.owner === owner && existing.repo === repo;
  const sameFiles = sameRepo && existing.files.length === files.length;

  if (sameFiles) {
    // Resume existing progress
    return existing;
  }

  // Fresh start (new repo or file list changed)
  const track = {
    owner,
    repo,
    branch,
    files: files.map(path => ({
      path,
      completed: false,
      accuracy:  null,
      wpm:       null,
      chars:     0,
    })),
    currentFileIndex: 0,
    totalChars:       0,
    totalErrors:      0,
    totalKeystrokes:  0,
    startedAt:        Date.now(),
  };

  data.tracks[trackId] = track;
  _write(data);
  return track;
}

/**
 * Mark a file as complete and save stats.
 */
function markFileComplete(trackId, fileIndex, engineStats) {
  const data  = _read();
  const track = data.tracks[trackId];
  if (!track) return;

  const file = track.files[fileIndex];
  if (file) {
    file.completed = true;
    file.accuracy  = engineStats.accuracy;
    file.wpm       = engineStats.wpm;
    file.chars     = engineStats.position;
  }

  track.totalChars      += engineStats.position;
  track.totalKeystrokes += engineStats.totalKeystrokes;
  track.totalErrors     += engineStats.errors;
  track.currentFileIndex = fileIndex + 1;

  _write(data);
}

/**
 * Reset a track completely (for "Restart" button).
 */
function resetTrack(trackId) {
  const data = _read();
  delete data.tracks[trackId];
  _write(data);
}

/**
 * Get the stored progress for a track, or null if not started.
 */
function getTrackProgress(trackId) {
  const data = _read();
  return data.tracks[trackId] || null;
}

/**
 * Get summary stats for displaying on track cards.
 *
 * @returns {{ filesCompleted, totalFiles, totalChars, pct }}
 */
function getTrackSummary(trackId) {
  const tp = getTrackProgress(trackId);
  if (!tp) return { filesCompleted: 0, totalFiles: 0, totalChars: 0, pct: 0 };

  const filesCompleted = tp.files.filter(f => f.completed).length;
  const totalFiles     = tp.files.length;
  const pct            = totalFiles > 0 ? Math.round((filesCompleted / totalFiles) * 100) : 0;

  return { filesCompleted, totalFiles, totalChars: tp.totalChars, pct };
}

/**
 * Get aggregate stats across ALL tracks (for landing page display).
 */
function getGlobalStats() {
  const data = _read();
  let totalChars    = 0;
  let totalFiles    = 0;
  let completedFiles = 0;

  for (const track of Object.values(data.tracks)) {
    totalChars     += track.totalChars;
    totalFiles     += track.files.length;
    completedFiles += track.files.filter(f => f.completed).length;
  }

  return { totalChars, totalFiles, completedFiles };
}

/* ── Custom Repo Overrides ──────────────────────────────────── */

function getCustomRepo(trackId) {
  try {
    const raw = localStorage.getItem(`ghostcode_repo_${trackId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setCustomRepo(trackId, owner, repo) {
  try {
    localStorage.setItem(`ghostcode_repo_${trackId}`, JSON.stringify({ owner, repo }));
  } catch { /* ignore */ }
}

function clearCustomRepo(trackId) {
  localStorage.removeItem(`ghostcode_repo_${trackId}`);
}
