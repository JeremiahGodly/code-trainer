/**
 * GhostCode AI — Application Controller
 *
 * Wires all modules together:
 *   tracks.js  → track definitions
 *   github.js  → file tree + file content fetching
 *   engine.js  → ghost typing engine
 *   progress.js→ localStorage persistence
 *   ui.js      → DOM rendering
 *
 * Global state lives in the `App` object below.
 * Never mutate it outside this file.
 */

/* ── Global Application State ──────────────────────────────── */
const App = {
  /* Current track being trained */
  currentTrack:   null,    // track object from TRACKS[]

  /* Data loaded from GitHub for this session */
  trackData: {
    owner:  '',
    repo:   '',
    branch: '',
    files:  [],            // string[] — filtered, sorted file paths
  },

  /* Auth token (optional) */
  token: null,

  /* Current file being typed */
  fileIndex: 0,

  /* GhostEngine instance for the current file */
  engine: null,

  /* Whether keyboard events should be routed to the engine */
  typingActive: false,

  /* Callback set when README intro is shown; cleared after use */
  readmeCallback: null,
};

/* ── Initialization ─────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initDomRefs();       // cache DOM refs in ui.js
  renderLandingStats();
  setupEvents();

  // Landing is shown by default (no hidden attr in HTML)
});

/* ── Event Wiring ───────────────────────────────────────────── */

function setupEvents() {
  /* Landing */
  document.getElementById('btn-start').addEventListener('click', () => {
    renderTracksGrid();
    showView('tracks');
  });

  /* Tracks → Landing */
  document.getElementById('btn-back-landing').addEventListener('click', () => {
    renderLandingStats();
    showView('landing');
  });

  /* Track cards */
  document.getElementById('tracks-grid').addEventListener('click', e => {
    const card = e.target.closest('.track-card');
    if (!card) return;
    const track = TRACKS.find(t => t.id === card.dataset.trackId);
    if (track) {
      App.currentTrack = track;
      openRepoModal(track);
    }
  });

  /* Modal: cancel */
  document.getElementById('btn-modal-cancel').addEventListener('click', closeRepoModal);
  document.getElementById('modal-backdrop').addEventListener('click', closeRepoModal);

  /* Modal: start / load */
  document.getElementById('btn-modal-start').addEventListener('click', onModalStart);
  document.getElementById('inp-repo').addEventListener('keydown', e => {
    if (e.key === 'Enter') onModalStart();
  });

  /* Editor: back to tracks */
  document.getElementById('btn-back-tracks').addEventListener('click', () => {
    App.typingActive = false;
    App.engine       = null;
    renderTracksGrid();
    showView('tracks');
  });

  /* File done overlay: next file */
  document.getElementById('btn-next-file').addEventListener('click', () => {
    hideFileDoneOverlay();
    advanceToNextFile();
  });

  /* Track done overlay: all tracks */
  document.getElementById('btn-all-tracks').addEventListener('click', () => {
    hideTrackDoneOverlay();
    App.typingActive = false;
    App.engine       = null;
    renderTracksGrid();
    showView('tracks');
  });

  /* Track done overlay: restart track */
  document.getElementById('btn-track-restart').addEventListener('click', () => {
    hideTrackDoneOverlay();
    resetTrack(App.currentTrack.id);
    startTrackSession(
      App.trackData.owner,
      App.trackData.repo,
      App.trackData.branch,
      App.trackData.files
    );
  });

  /* ── Keyboard handler ── */
  document.addEventListener('keydown', onKeyDown);

  /* Block paste everywhere */
  document.addEventListener('paste', e => e.preventDefault());

  /* Block right-click (prevents paste via context menu) */
  document.addEventListener('contextmenu', e => e.preventDefault());

  /* Block drag-drop */
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop',     e => e.preventDefault());

  /* README intro overlay */
  document.getElementById('btn-readme-start').addEventListener('click', () => {
    // Advance past the README file to the next typeable file
    App.readmeCallback && App.readmeCallback();
  });
  document.getElementById('btn-readme-skip').addEventListener('click', () => {
    App.readmeCallback && App.readmeCallback();
  });
}

/* ── Modal Start Handler ────────────────────────────────────── */

async function onModalStart() {
  const track     = App.currentTrack;
  const repoRaw   = document.getElementById('inp-repo').value.trim();
  const tokenRaw  = document.getElementById('inp-token').value.trim();

  const parsed = parseRepoUrl(repoRaw);
  if (!parsed) {
    alert('Invalid GitHub URL.\nUse: https://github.com/owner/repo  or  owner/repo');
    return;
  }

  closeRepoModal();

  const { owner, repo } = parsed;
  const token = tokenRaw || null;

  // Save custom repo if it differs from the default
  const defParsed = parseRepoUrl(track.defaultRepo);
  if (!defParsed || owner !== defParsed.owner || repo !== defParsed.repo) {
    setCustomRepo(track.id, owner, repo);
  } else {
    clearCustomRepo(track.id);  // using default — clear override
  }

  App.token = token;

  // Show loading
  showView('loading');
  setLoadingMessage(`Fetching ${owner}/${repo}…`);

  try {
    const { files, branch } = await fetchFileTree(owner, repo, token, track.branch);

    if (files.length === 0) {
      alert(
        `No typeable code files found in "${owner}/${repo}".\n\n` +
        `This can happen if the repo uses formats not supported ` +
        `(Jupyter notebooks, images, binaries, etc.).\n\n` +
        `Try a different repository.`
      );
      renderTracksGrid();
      showView('tracks');
      return;
    }

    setLoadingMessage(`Found ${files.length} files. Preparing…`);
    startTrackSession(owner, repo, branch, files);

  } catch (err) {
    alert(`Error loading repository:\n\n${err.message}`);
    renderTracksGrid();
    showView('tracks');
  }
}

/* ── Track Session Initialization ──────────────────────────── */

function startTrackSession(owner, repo, branch, files) {
  const track = App.currentTrack;

  App.trackData = { owner, repo, branch, files };

  // Load or init progress (will reset if repo/file list changed)
  const progress = loadOrInitTrack(track.id, owner, repo, branch, files);

  // Clamp currentFileIndex in case of edge cases
  App.fileIndex = Math.min(progress.currentFileIndex, files.length);

  loadFileAtIndex(App.fileIndex);
}

/* ── File Loading ───────────────────────────────────────────── */

async function loadFileAtIndex(index) {
  const track  = App.currentTrack;
  const { owner, repo, branch, files } = App.trackData;

  // ── All files complete ──
  if (index >= files.length) {
    const summary = getTrackSummary(track.id);
    showView('editor');   // make sure editor is visible for the overlay
    showTrackDoneOverlay(summary, track.name);
    return;
  }

  const filePath = files[index];

  // ── Markdown files: show as intro window, don't type it ──
  if (/\.mdx?$/i.test(filePath)) {
    showReadmeIntro(filePath, index);
    return;
  }

  // Show editor shell immediately (file tree + topbar)
  showView('editor');
  updateTopbarBreadcrumb(track.name, filePath);
  renderFileTree(files, index);
  updateProgressBars(0, index, files.length);
  updateTopbarStats({ wpm: 0, accuracy: 100, position: 0 });

  // Clear code display while loading (use public ui helper)
  clearCodeDisplay();

  App.typingActive = false;
  App.engine       = null;

  try {
    const content = await fetchFileContent(owner, repo, branch, filePath, App.token);

    // Skip files that are effectively empty after normalization
    if (!content || content.trim().length < 3) {
      console.info(`[GhostCode] Skipping empty file: ${filePath}`);
      markFileComplete(track.id, index, {
        position: 0, accuracy: 100, wpm: 0,
        totalKeystrokes: 0, errors: 0,
      });
      loadFileAtIndex(index + 1);
      return;
    }

    // ── Initialize engine ──
    App.engine = new GhostEngine({
      content,

      onProgress(stats) {
        updateTopbarStats(stats);
        updateProgressBars(stats.progressPct, index, files.length);
        renderCode(App.engine.getRenderParts());
      },

      onComplete(stats) {
        markFileComplete(track.id, index, stats);
        App.typingActive = false;

        const isLast = index >= files.length - 1;
        showFileDoneOverlay(stats, isLast);
      },

      onError() {
        flashError();
      },
    });

    App.fileIndex    = index;
    App.typingActive = true;

    // Initial render
    renderCode(App.engine.getRenderParts());
    updateTopbarStats(App.engine.getStats());

  } catch (err) {
    // File failed to load — skip it silently
    console.warn(`[GhostCode] Skipping ${filePath}: ${err.message}`);
    markFileComplete(track.id, index, {
      position: 0, accuracy: 100, wpm: 0,
      totalKeystrokes: 0, errors: 0,
    });
    loadFileAtIndex(index + 1);
  }
}

/* ── File Advancement ───────────────────────────────────────── */

function advanceToNextFile() {
  const nextIndex = App.fileIndex + 1;
  App.fileIndex   = nextIndex;

  if (nextIndex >= App.trackData.files.length) {
    const summary = getTrackSummary(App.currentTrack.id);
    showTrackDoneOverlay(summary, App.currentTrack.name);
    return;
  }

  loadFileAtIndex(nextIndex);
}

/* ── README Intro Window ────────────────────────────────────── */

/**
 * Fetch a README.md file, render it as a readable intro window,
 * then advance to the next file when the user clicks Start / Skip.
 * The README itself is never added to the typing engine.
 */
async function showReadmeIntro(filePath, readmeIndex) {
  const track  = App.currentTrack;
  const { owner, repo, branch, files } = App.trackData;

  // Callback: skip past this README and load next file
  const proceedToNext = () => {
    App.readmeCallback = null;
    // Mark README as "complete" so progress tracking isn't confused
    markFileComplete(track.id, readmeIndex, {
      position: 0, accuracy: 100, wpm: 0,
      totalKeystrokes: 0, errors: 0,
    });
    App.fileIndex = readmeIndex + 1;
    loadFileAtIndex(App.fileIndex);
  };

  App.readmeCallback = proceedToNext;

  // Show loading while we fetch the README
  showView('loading');
  setLoadingMessage(`Loading ${filePath}...`);

  try {
    const raw = await fetchFileContent(owner, repo, branch, filePath, App.token);

    // Render in the README view
    document.getElementById('readme-crumb').textContent =
      `${track.name}  /  ${filePath}`;
    document.getElementById('readme-content').textContent = raw;

    showView('readme');
  } catch (err) {
    // If README can't be loaded, just skip it
    console.warn(`[GhostCode] Could not load README: ${err.message}`);
    proceedToNext();
  }
}


/* ── Keyboard Handler ───────────────────────────────────────── */

function onKeyDown(e) {
  // Only handle when the editor is active and engine is ready
  if (!App.typingActive || !App.engine) return;

  // Block all Ctrl/Cmd shortcuts while typing
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    return;
  }

  // Keys to silently ignore (don't pass to engine)
  const IGNORED = new Set([
    'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
    'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
    'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End', 'PageUp', 'PageDown', 'Insert',
    'Backspace', 'Delete',
    'ContextMenu', 'PrintScreen',
  ]);

  if (IGNORED.has(e.key)) {
    // Still prevent scroll-keys from moving the page
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
         'PageUp', 'PageDown'].includes(e.key)) {
      e.preventDefault();
    }
    return;
  }

  // Prevent Tab from switching focus
  if (e.key === 'Tab') {
    e.preventDefault();
  }

  // Prevent Space from scrolling the page
  if (e.key === ' ') {
    e.preventDefault();
  }

  // Delegate to engine
  App.engine.handleKey(e.key);
}
