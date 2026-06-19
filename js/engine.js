/**
 * GhostCode AI — Ghost Typing Engine
 *
 * Core rules:
 *  - Content is a normalized string (tabs→spaces, CRLF→LF).
 *  - User must type every character including spaces and newlines (Enter).
 *  - Correct keypress → advance cursor.
 *  - Wrong keypress  → fire onError, do NOT advance.
 *  - No backspace, no paste, no autocomplete.
 *
 * Usage:
 *   const engine = new GhostEngine({ content, onProgress, onComplete, onError });
 *   engine.handleKey('f');  // called from keydown handler
 *   const parts = engine.getRenderParts();  // for display
 */

class GhostEngine {
  /**
   * @param {object} opts
   * @param {string}   opts.content      — Normalized file content to type
   * @param {Function} opts.onProgress   — Called every correct keypress: (stats) => void
   * @param {Function} opts.onComplete   — Called when all chars typed: (stats) => void
   * @param {Function} opts.onError      — Called on wrong keypress: ({ key, expected }) => void
   */
  constructor({ content, onProgress, onComplete, onError }) {
    if (typeof content !== 'string' || content.length === 0) {
      throw new Error('GhostEngine: content must be a non-empty string');
    }

    this.content          = content;
    this.position         = 0;       // index of the char the user must type next
    this.errors           = 0;       // total wrong keypresses
    this.totalKeystrokes  = 0;       // correct + wrong
    this.startTime        = null;    // Date.now() on first keypress
    this.isComplete       = false;

    this._onProgress = onProgress || (() => {});
    this._onComplete = onComplete || (() => {});
    this._onError    = onError    || (() => {});
  }

  /* ── Computed Properties ─────────────────────────────────── */

  get currentChar() {
    return this.content[this.position];
  }

  /** Accuracy 0–100 (integer). 100 until first keypress. */
  get accuracy() {
    if (this.totalKeystrokes === 0) return 100;
    const correct = this.totalKeystrokes - this.errors;
    return Math.round((correct / this.totalKeystrokes) * 100);
  }

  /** Words Per Minute (chars / 5 / minutes). 0 until meaningful data. */
  get wpm() {
    if (!this.startTime || this.position < 5) return 0;
    const mins = (Date.now() - this.startTime) / 60_000;
    if (mins < 0.01) return 0;
    return Math.round((this.position / 5) / mins);
  }

  /** 0–100 completion percentage. */
  get progressPct() {
    if (this.content.length === 0) return 100;
    return Math.round((this.position / this.content.length) * 100);
  }

  /* ── Public Methods ─────────────────────────────────────── */

  /** Returns the current stats snapshot. */
  getStats() {
    return {
      position:       this.position,
      total:          this.content.length,
      errors:         this.errors,
      totalKeystrokes:this.totalKeystrokes,
      accuracy:       this.accuracy,
      wpm:            this.wpm,
      progressPct:    this.progressPct,
    };
  }

  /**
   * Returns the three segments needed to render the editor.
   * @returns {{ typed, cursor, remaining, isAtNewline, isAtEnd }}
   */
  getRenderParts() {
    const pos     = this.position;
    const content = this.content;
    const cur     = content[pos];
    const isAtEnd     = pos >= content.length;
    const isAtNewline = !isAtEnd && cur === '\n';

    return {
      typed:       content.slice(0, pos),
      cursor:      isAtEnd ? '' : (isAtNewline ? '↵' : cur),
      remaining:   isAtEnd ? '' : (isAtNewline ? '\n' + content.slice(pos + 1) : content.slice(pos + 1)),
      isAtNewline,
      isAtEnd,
    };
  }

  /**
   * Process a keypress event key string.
   * @param {string} key — e.key value from KeyboardEvent
   * @returns {boolean}  — true if correct, false if wrong or ignored
   */
  handleKey(key) {
    if (this.isComplete) return false;

    const expected = this.currentChar;
    if (expected === undefined) return false;

    // Map keyboard keys to expected characters
    let inputChar;
    if      (key === 'Enter') inputChar = '\n';
    else if (key === 'Tab')   inputChar = '\t';   // tab was already expanded to spaces in normalize,
                                                  // but handle just in case any remain
    else if (key.length === 1) inputChar = key;   // printable character
    else return false;                            // special key, ignore silently

    // Start timer on first real keypress
    if (!this.startTime) {
      this.startTime = Date.now();
    }

    if (inputChar === expected) {
      // ✓ Correct
      this.position++;
      this.totalKeystrokes++;

      const stats = this.getStats();

      if (this.position >= this.content.length) {
        this.isComplete = true;
        this._onProgress(stats);
        this._onComplete(stats);
      } else {
        this._onProgress(stats);
      }
      return true;

    } else {
      // ✗ Wrong
      this.errors++;
      this.totalKeystrokes++;
      this._onError({ key, expected });
      return false;
    }
  }
}
