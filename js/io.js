/**
 * io.js
 * Handles saving tracker data to a JSON file and loading it back in.
 */

const FILE_VERSION = 1;

let _toastTimer = null;

function showToast(msg, durationMs = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), durationMs);
}

function saveToFile() {
  const state = getState();
  const payload = {
    _version: FILE_VERSION,
    _saved: new Date().toISOString(),
    ...state
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `story-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✓ Saved to file');
}

function triggerLoad() {
  document.getElementById('load-input').click();
}

function handleFileLoad(event) {
  const file = event.target.files[0];
  if (!file) return;
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

function _validateAndApply(payload) {
  if (!payload.characters || !Array.isArray(payload.characters))
    throw new Error('Missing "characters".');
  if (!payload.rows || !Array.isArray(payload.rows))
    throw new Error('Missing "rows".');

  const { _version, _saved, ...state } = payload;
  if (!state.colWidths) state.colWidths = {};

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
