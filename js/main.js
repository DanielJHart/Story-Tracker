/**
 * main.js
 * Entry point — wires up buttons and boots the app.
 */

function addCharacter() {
  const id = uid();
  const s  = getState();
  s.characters.push({ id, name: '' });
  s.rows.forEach(r => { r.cells[id] = ''; });
  setState(s);
  requestAnimationFrame(() => {
    const inputs = document.querySelectorAll('.char-name-input');
    if (inputs.length) inputs[inputs.length - 1].focus();
  });
}

function addRow() {
  const s     = getState();
  const cells = {};
  s.characters.forEach(c => { cells[c.id] = ''; });
  s.rows.push({ id: uid(), time: '', type: 'scene', cells });
  setState(s);
  requestAnimationFrame(() => {
    const tas = document.querySelectorAll('.time-textarea');
    if (tas.length) tas[tas.length - 1].focus();
  });
}

document.getElementById('add-char-btn').addEventListener('click', addCharacter);
document.getElementById('add-event-btn').addEventListener('click', addRow);
document.getElementById('add-row-bottom').addEventListener('click', addRow);
document.getElementById('save-btn').addEventListener('click', saveToFile);
document.getElementById('load-btn').addEventListener('click', triggerLoad);
document.getElementById('load-input').addEventListener('change', handleFileLoad);

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveToFile();
  }
});

loadFromStorage();
render();
