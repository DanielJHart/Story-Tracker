/**
 * state.js
 * Single source of truth for all tracker data.
 * Exposes getState / setState and handles localStorage persistence.
 */

const STORAGE_KEY = 'story-tracker-v1';

const DEFAULT_STATE = {
  characters: [
    { id: 'c1', name: 'Character 1' },
    { id: 'c2', name: 'Character 2' },
  ],
  rows: [
    { id: 'r1', time: '', type: 'scene', cells: {} }
  ]
};

let _state = structuredClone(DEFAULT_STATE);

/** Return a deep copy of the current state. */
function getState() {
  return structuredClone(_state);
}

/**
 * Replace the entire state, persist to localStorage, and re-render.
 * @param {object} newState
 */
function setState(newState) {
  _state = newState;
  _persist();
  render(); // defined in render.js
}

/** Persist current state to localStorage (best-effort). */
function _persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch (e) {
    console.warn('localStorage unavailable – changes will not persist between sessions.', e);
  }
}

/** Load state from localStorage, falling back to defaults. */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      _state = JSON.parse(raw);
      return true;
    }
  } catch (e) {
    console.warn('Could not parse saved state.', e);
  }
  _state = structuredClone(DEFAULT_STATE);
  return false;
}

/** Generate a short random ID. */
function uid() {
  return 'id' + Math.random().toString(36).slice(2, 9);
}

/** Escape HTML special characters. */
function escHtml(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
