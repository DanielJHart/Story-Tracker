/**
 * io.js
 * Handles saving tracker data to a JSON file and loading it back in.
 */

const FILE_VERSION = 1;

// ── Toast notification ──────────────────────────────────────────────

let _toastTimer = null;

function showToast(msg, durationMs = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), durationMs);
}

// ── Save ────────────────────────────────────────────────────────────

/**
 * Serialise current state to a .json file and trigger a browser download.
 */
function saveToFile() {
  const state = getState();

  const payload = {
    _version: FILE_VERSION,
    _saved: new Date().toISOString(),
    ...state
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = _buildFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('✓ Saved to file');
}

function _buildFilename() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return `story-tracker-${date}.json`;
}

// ── Load ────────────────────────────────────────────────────────────

/**
 * Open the hidden file input so the user can pick a .json file.
 */
function triggerLoad() {
  document.getElementById('load-input').click();
}

/**
 * Handle a file chosen via the file input.
 * @param {Event} event – the 'change' event from the file input
 */
function handleFileLoad(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Reset the input so the same file can be re-loaded if needed
  event.target.value = '';

  const reader = new FileReader();

  reader.onload = e => {
    try {
      const payload = JSON.parse(e.target.result);
      _validateAndApply(payload);
    } catch (err) {
      alert('Could not read the file. Make sure it is a valid Story Tracker JSON file.');
      console.error('Load error:', err);
    }
  };

  reader.onerror = () => alert('Failed to read the file.');
  reader.readAsText(file);
}

/**
 * Validate a parsed payload and apply it as the new state.
 * @param {object} payload
 */
function _validateAndApply(payload) {
  if (!payload.characters || !Array.isArray(payload.characters)) {
    throw new Error('Missing or invalid "characters" array.');
  }
  if (!payload.rows || !Array.isArray(payload.rows)) {
    throw new Error('Missing or invalid "rows" array.');
  }

  // Strip file-metadata fields before storing
  const { _version, _saved, ...state } = payload;

  // Ensure every row has a cells object and entries for all characters
  state.rows = state.rows.map(row => {
    row.cells = row.cells || {};
    state.characters.forEach(ch => {
      if (!(ch.id in row.cells)) row.cells[ch.id] = '';
    });
    return row;
  });

  setState(state);
  showToast('✓ Data loaded');
}
