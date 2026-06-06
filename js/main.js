/**
 * main.js
 * Entry point: wires up buttons and kicks off the initial render.
 * Depends on: state.js, render.js, io.js  (loaded before this in index.html)
 */

// ── Add character ───────────────────────────────────────────────────

function addCharacter() {
  const id = uid();
  const s  = getState();
  s.characters.push({ id, name: '' });
  s.rows.forEach(r => { r.cells[id] = ''; });
  setState(s);

  // Focus the new name input
  requestAnimationFrame(() => {
    const inputs = document.querySelectorAll('.char-name-input');
    if (inputs.length) inputs[inputs.length - 1].focus();
  });
}

// ── Add event row ───────────────────────────────────────────────────

function addRow() {
  const s     = getState();
  const cells = {};
  s.characters.forEach(c => { cells[c.id] = ''; });
  s.rows.push({ id: uid(), time: '', type: 'scene', cells });
  setState(s);

  // Focus the new time textarea
  requestAnimationFrame(() => {
    const tas = document.querySelectorAll('textarea[data-field="time"]');
    if (tas.length) tas[tas.length - 1].focus();
  });
}

// ── Button wiring ───────────────────────────────────────────────────

document.getElementById('add-char-btn').addEventListener('click', addCharacter);
document.getElementById('add-event-btn').addEventListener('click', addRow);
document.getElementById('add-row-bottom').addEventListener('click', addRow);
document.getElementById('save-btn').addEventListener('click', saveToFile);
document.getElementById('load-btn').addEventListener('click', triggerLoad);
document.getElementById('load-input').addEventListener('change', handleFileLoad);

// ── Keyboard shortcuts ──────────────────────────────────────────────

document.addEventListener('keydown', e => {
  // Ctrl/Cmd + S → save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveToFile();
  }
});

// ── Boot ────────────────────────────────────────────────────────────

loadFromStorage();
render();
