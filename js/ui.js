/**
 * GhostCode AI — UI Rendering Module
 *
 * Handles all DOM mutations:
 *  - View switching
 *  - Track grid rendering
 *  - File tree rendering
 *  - Editor content rendering (typed / cursor / remaining)
 *  - Stats + progress bar updates
 *  - Overlay show/hide
 */

/* ── Cached DOM refs (initialized after DOMContentLoaded) ────── */
let _typedEl    = null;
let _cursorEl   = null;
let _remainingEl = null;

function initDomRefs() {
  _typedEl     = document.getElementById('code-typed');
  _cursorEl    = document.getElementById('code-cursor');
  _remainingEl = document.getElementById('code-remaining');
}

/* ================================================================
   VIEW SWITCHING
   ================================================================ */

/**
 * Show one view, hide all others.
 * @param {'landing'|'tracks'|'loading'|'editor'} id
 */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => { v.hidden = true; });
  const el = document.getElementById('view-' + id);
  if (el) el.hidden = false;
}

/* ================================================================
   LANDING
   ================================================================ */

function renderLandingStats() {
  const stats = getGlobalStats();
  const el    = document.getElementById('landing-stats');
  if (!el) return;

  if (stats.completedFiles > 0) {
    el.textContent =
      `${stats.completedFiles.toLocaleString()} files · ` +
      `${stats.totalChars.toLocaleString()} characters typed`;
  } else {
    el.textContent = '';
  }
}

/* ================================================================
   TRACK GRID
   ================================================================ */

/**
 * Render all 9 track cards into #tracks-grid.
 */
function renderTracksGrid() {
  const grid = document.getElementById('tracks-grid');
  if (!grid) return;
  grid.innerHTML = '';

  TRACKS.forEach(track => {
    const customRepo = getCustomRepo(track.id);
    const repoSlug   = customRepo
      ? `${customRepo.owner}/${customRepo.repo}`
      : track.defaultRepo;

    const summary = getTrackSummary(track.id);
    const isComplete = summary.pct === 100 && summary.totalFiles > 0;

    const card = document.createElement('button');
    card.className          = 'track-card';
    card.dataset.trackId    = track.id;
    card.setAttribute('aria-label', `Start ${track.name}`);

    card.innerHTML = `
      <div class="tc-icon" aria-hidden="true">${track.icon}</div>
      <div class="tc-name">${track.name}</div>
      <div class="tc-desc">${track.desc}</div>
      <div class="tc-repo">${repoSlug}</div>
      <div class="tc-progress">
        <div class="tc-prog-bar">
          <div class="tc-prog-fill" style="width:${summary.pct}%"></div>
        </div>
        <div class="tc-prog-text">${
          summary.totalFiles > 0
            ? `${summary.filesCompleted} / ${summary.totalFiles} files`
            : 'Not started'
        }</div>
      </div>
      ${isComplete ? '<div class="tc-badge">COMPLETE</div>' : ''}
    `;

    grid.appendChild(card);
  });
}

/* ================================================================
   LOADING
   ================================================================ */

function setLoadingMessage(msg) {
  const el = document.getElementById('loading-msg');
  if (el) el.textContent = msg;
}

/* ================================================================
   EDITOR: TOP BAR
   ================================================================ */

function updateTopbarBreadcrumb(trackName, filePath) {
  const trEl = document.getElementById('tb-track');
  const fiEl = document.getElementById('tb-file');
  if (trEl) trEl.textContent = trackName;
  if (fiEl) fiEl.textContent = filePath;
}

function updateTopbarStats(stats) {
  document.getElementById('sv-wpm').textContent   = stats.wpm;
  document.getElementById('sv-acc').textContent   = stats.accuracy;
  document.getElementById('sv-chars').textContent = stats.position.toLocaleString();
}

/* ================================================================
   FILE TREE
   ================================================================ */

/**
 * Render file tree list.
 * @param {string[]} files        — all file paths in track
 * @param {number}   currentIndex — index of file currently being typed
 */
function renderFileTree(files, currentIndex) {
  const tree = document.getElementById('filetree');
  if (!tree) return;
  tree.innerHTML = '';

  files.forEach((path, i) => {
    const item = document.createElement('div');
    item.className = 'ft-item';
    if (i < currentIndex)      item.classList.add('ft-done');
    else if (i === currentIndex) item.classList.add('ft-current');

    const icon = i < currentIndex ? '✓' : i === currentIndex ? '▶' : '·';
    const name = path.split('/').pop();  // show just filename

    item.innerHTML =
      `<span class="ft-icon" aria-hidden="true">${icon}</span>` +
      `<span class="ft-name" title="${path}">${name}</span>`;

    tree.appendChild(item);
  });

  // Scroll current item into view
  const cur = tree.querySelector('.ft-current');
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}

/* ================================================================
   EDITOR: CODE DISPLAY (Ghost Typing)
   ================================================================ */

/**
 * Render the typed / cursor / remaining spans.
 * Called every time engine.getRenderParts() changes.
 *
 * @param {{ typed, cursor, remaining, isAtNewline, isAtEnd }} parts
 */
function renderCode(parts) {
  const { typed, cursor, remaining, isAtNewline } = parts;

  _typedEl.textContent    = typed;
  _cursorEl.textContent   = cursor;   // '↵' when at newline, actual char otherwise
  _remainingEl.textContent = remaining; // starts with '\n' when isAtNewline

  // Style the cursor span
  _cursorEl.className = isAtNewline ? 'code-cursor at-newline' : 'code-cursor';

  // Auto-scroll cursor into center of visible area
  _cursorEl.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
}

/**
 * Flash the cursor red to indicate a wrong keypress.
 * Automatically reverts after 180ms.
 */
function flashError() {
  _cursorEl.classList.add('is-error');
  setTimeout(() => _cursorEl.classList.remove('is-error'), 180);
}

/**
 * Clear the code display and show a loading placeholder.
 * Called while a new file is being fetched.
 */
function clearCodeDisplay() {
  _typedEl.textContent     = '';
  _cursorEl.textContent    = '…';
  _cursorEl.className      = 'code-cursor';
  _remainingEl.textContent = '';
}

/* ================================================================
   PROGRESS BARS
   ================================================================ */

/**
 * @param {number} filePct        — 0..100
 * @param {number} filesCompleted — count
 * @param {number} totalFiles     — count
 */
function updateProgressBars(filePct, filesCompleted, totalFiles) {
  const fFill = document.getElementById('sbar-file');
  const fPct  = document.getElementById('sbar-file-pct');
  const tFill = document.getElementById('sbar-track');
  const tPct  = document.getElementById('sbar-track-pct');

  if (fFill) fFill.style.width = filePct + '%';
  if (fPct)  fPct.textContent  = filePct + '%';

  const trackPct = totalFiles > 0 ? Math.round((filesCompleted / totalFiles) * 100) : 0;
  if (tFill) tFill.style.width = trackPct + '%';
  if (tPct)  tPct.textContent  = `${filesCompleted} / ${totalFiles}`;
}

/* ================================================================
   OVERLAYS
   ================================================================ */

/**
 * Show the "File Complete" overlay.
 * @param {object} stats    — engine stats
 * @param {boolean} isLast  — true if this was the last file in track
 */
function showFileDoneOverlay(stats, isLast) {
  document.getElementById('fd-title').textContent  = isLast ? 'All Files Done!' : 'File Complete';
  document.getElementById('fd-acc').textContent    = stats.accuracy + '%';
  document.getElementById('fd-wpm').textContent    = stats.wpm;
  document.getElementById('fd-chars').textContent  = stats.position.toLocaleString();
  document.getElementById('ov-file-done').hidden   = false;
}

function hideFileDoneOverlay() {
  document.getElementById('ov-file-done').hidden = true;
}

/**
 * Show the "Track Complete" overlay.
 * @param {{ filesCompleted, totalChars }} summary
 * @param {string} trackName
 */
function showTrackDoneOverlay(summary, trackName) {
  document.getElementById('td-sub').textContent   = `You completed all files in ${trackName}.`;
  document.getElementById('td-files').textContent = summary.filesCompleted.toLocaleString();
  document.getElementById('td-chars').textContent = summary.totalChars.toLocaleString();
  document.getElementById('ov-track-done').hidden = false;
}

function hideTrackDoneOverlay() {
  document.getElementById('ov-track-done').hidden = true;
}

/* ================================================================
   MODAL
   ================================================================ */

/**
 * Open the repo config modal for a given track.
 */
function openRepoModal(track) {
  document.getElementById('modal-icon').textContent  = track.icon;
  document.getElementById('modal-title').textContent = track.name;
  document.getElementById('modal-purpose').textContent = track.purpose || '';

  const custom = getCustomRepo(track.id);
  const repoUrl = custom
    ? `https://github.com/${custom.owner}/${custom.repo}`
    : `https://github.com/${track.defaultRepo}`;

  document.getElementById('inp-repo').value  = repoUrl;
  document.getElementById('inp-token').value = '';

  document.getElementById('modal-repo').hidden = false;

  // Focus the repo input
  setTimeout(() => document.getElementById('inp-repo').focus(), 50);
}

function closeRepoModal() {
  document.getElementById('modal-repo').hidden = true;
}
