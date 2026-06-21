/**
 * state.js
 * Single source of truth for all tracker data.
 *
 * Two update paths:
 *   saveState(s)  – persists to localStorage only, no DOM rebuild.
 *                   Use this for text edits (keystrokes).
 *   setState(s)   – persists AND re-renders the whole UI.
 *                   Use this for structural changes (add/remove/reorder).
 */

const STORAGE_KEY = 'story-tracker-v1';

const DEFAULT_STATE = {
  characters: [
    { id: 'c1', name: 'Character 1' },
    { id: 'c2', name: 'Character 2' },
  ],
  rows: [
    { id: 'r1', time: '', type: 'scene', cells: {} }
  ],
  colWidths: {}
};

let _state = structuredClone(DEFAULT_STATE);

/** Return the live state object. */
function getState() {
  return _state;
}

/** Persist only — no re-render. Use for keystroke-level updates. */
function saveState(newState) {
  _state = newState;
  _persist();
}

/** Persist AND re-render. Use for structural changes. */
function setState(newState) {
  _state = newState;
  _persist();
  render();
}

function _persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch (e) {
    console.warn('localStorage unavailable.', e);
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      _state = JSON.parse(raw);
      if (!_state.colWidths) _state.colWidths = {};
      return true;
    }
  } catch (e) {
    console.warn('Could not parse saved state.', e);
  }
  _state = structuredClone(DEFAULT_STATE);
  return false;
}

function uid() {
  return 'id' + Math.random().toString(36).slice(2, 9);
}

function escHtml(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
