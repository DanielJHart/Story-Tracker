/**
 * render.js
 * Two-panel layout:
 *   Left panel  – pinned time column, scrolls vertically only
 *   Right panel – character columns, scrolls horizontally and vertically
 *
 * Vertical scroll is kept in sync between the two panels by mirroring
 * the right-body scrollTop into the left-body scrollTop.
 */

const TYPES      = ['scene', 'chapter', 'note'];
const MIN_COL_W  = 120;   // px — narrowest a character column can go
const DEF_COL_W  = 220;   // px — default width for new columns

let _dragSrcId   = null;
let _syncBound   = false;   // vertical-sync listener attached once

/* ── Helpers ───────────────────────────────────────────────────── */

function autoResize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

/* ── Top-level render ──────────────────────────────────────────── */

function render() {
  renderHeader();
  renderRows();
  syncRowHeights();
  bindVerticalSync();
}

/* ── Header ────────────────────────────────────────────────────── */

function renderHeader() {
  const state = getState();
  const head  = document.getElementById('panel-right-head-inner');
  head.innerHTML = '';

  state.characters.forEach(ch => {
    const w = _colWidth(ch.id);
    const cell = document.createElement('div');
    cell.className = 'char-header';
    cell.dataset.cid = ch.id;
    cell.style.width    = w + 'px';
    cell.style.minWidth = w + 'px';
    cell.style.maxWidth = w + 'px';
    cell.innerHTML = `
      <i class="ti ti-user-circle" style="font-size:15px;flex-shrink:0"></i>
      <input class="char-name-input"
             value="${escHtml(ch.name)}"
             placeholder="Name…"
             data-cid="${ch.id}" />
      <button class="del-char" data-cid="${ch.id}" title="Remove character">
        <i class="ti ti-x"></i>
      </button>
      <div class="col-resize-handle" data-cid="${ch.id}" title="Drag to resize column"></div>`;
    head.appendChild(cell);
  });

  // Character rename — no re-render needed
  head.querySelectorAll('.char-name-input').forEach(inp => {
    inp.addEventListener('input', e => {
      const s  = getState();
      const ch = s.characters.find(c => c.id === e.target.dataset.cid);
      if (ch) { ch.name = e.target.value; saveState(s); }
    });
  });

  // Remove character — structural change
  head.querySelectorAll('.del-char').forEach(btn => {
    btn.addEventListener('click', e => {
      if (getState().characters.length <= 1) {
        alert('You need at least one character column.');
        return;
      }
      if (!confirm('Remove this character and all their data?')) return;
      const cid = e.currentTarget.dataset.cid;
      const s   = getState();
      s.characters = s.characters.filter(c => c.id !== cid);
      s.rows.forEach(r => delete r.cells[cid]);
      setState(s);
    });
  });

  // Resize handles
  head.querySelectorAll('.col-resize-handle').forEach(handle => {
    handle.addEventListener('mousedown', _startColResize);
  });
}

/* ── Column width helpers ──────────────────────────────────────── */

/** Return the stored width for a character column, or the default. */
function _colWidth(cid) {
  const s = getState();
  return (s.colWidths && s.colWidths[cid]) || DEF_COL_W;
}

/** Apply a new pixel width to every DOM element belonging to column `cid`. */
function _applyColWidth(cid, w) {
  const px = w + 'px';
  // Header cell
  const header = document.querySelector(`.char-header[data-cid="${cid}"]`);
  if (header) {
    header.style.width    = px;
    header.style.minWidth = px;
    header.style.maxWidth = px;
  }
  // All body cells
  document.querySelectorAll(`.char-cell[data-cid="${cid}"]`).forEach(cell => {
    cell.style.width    = px;
    cell.style.minWidth = px;
    cell.style.maxWidth = px;
  });
}

/* ── Column resize drag ────────────────────────────────────────── */

function _startColResize(e) {
  e.preventDefault();
  const cid      = e.currentTarget.dataset.cid;
  const startX   = e.clientX;
  const startW   = _colWidth(cid);
  const handle   = e.currentTarget;

  handle.classList.add('resizing');
  document.body.classList.add('col-resizing');

  function onMove(e) {
    const w = Math.max(MIN_COL_W, startW + (e.clientX - startX));
    _applyColWidth(cid, w);
    syncRowHeights();
  }

  function onUp(e) {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',   onUp);
    handle.classList.remove('resizing');
    document.body.classList.remove('col-resizing');

    // Persist the final width
    const w = Math.max(MIN_COL_W, startW + (e.clientX - startX));
    const s = getState();
    if (!s.colWidths) s.colWidths = {};
    s.colWidths[cid] = w;
    saveState(s);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onUp);
}

/* ── Rows ──────────────────────────────────────────────────────── */

function renderRows() {
  const state     = getState();
  const leftBody  = document.getElementById('panel-left-body');
  const rightRows = document.getElementById('right-rows');

  leftBody.innerHTML  = '';
  rightRows.innerHTML = '';

  if (state.rows.length === 0) {
    leftBody.innerHTML  = '<div class="empty-state">No events yet.</div>';
    rightRows.innerHTML = '<div class="empty-state">Add an event to get started.</div>';
    return;
  }

  state.rows.forEach((row, idx) => {
    leftBody.appendChild( _buildLeftRow(row, idx, state) );
    rightRows.appendChild( _buildRightRow(row, state) );
  });

  // Auto-resize all textareas
  document.querySelectorAll('textarea').forEach(autoResize);
}

/* ── Left row (time cell) ──────────────────────────────────────── */

function _buildLeftRow(row, idx, state) {
  const div = document.createElement('div');
  div.className = 'left-row';
  div.dataset.rid = row.id;

  // Top: drag handle + type badge
  const top = document.createElement('div');
  top.className = 'time-top';

  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.title = 'Drag to reorder';
  handle.innerHTML = '<i class="ti ti-grip-vertical"></i>';
  top.appendChild(handle);

  const badge = document.createElement('span');
  badge.className = `type-badge type-${row.type}`;
  badge.title = 'Click to cycle type';
  badge.textContent = row.type;
  badge.addEventListener('click', () => {
    const s = getState();
    const r = s.rows.find(r => r.id === row.id);
    if (!r) return;
    r.type = TYPES[(TYPES.indexOf(r.type) + 1) % TYPES.length];
    saveState(s);
    badge.className = `type-badge type-${r.type}`;
    badge.textContent = r.type;
  });
  top.appendChild(badge);
  div.appendChild(top);

  // Time textarea
  const ta = document.createElement('textarea');
  ta.className = 'time-textarea';
  ta.placeholder = 'e.g. Chapter 3, dawn…';
  ta.dataset.rid = row.id;
  ta.dataset.field = 'time';
  ta.textContent = row.time || '';
  ta.addEventListener('input', e => {
    autoResize(e.target);
    const s = getState();
    const r = s.rows.find(r => r.id === row.id);
    if (r) { r.time = e.target.value; saveState(s); }
    // Mirror height to the paired right row
    _syncSingleRowHeight(row.id);
  });
  div.appendChild(ta);

  // Bottom: move buttons + delete
  const bottom = document.createElement('div');
  bottom.className = 'time-bottom';

  const makeBtn = (action, icon, title, cls = '') => {
    const b = document.createElement('button');
    b.className = `row-btn${cls ? ' ' + cls : ''}`;
    b.title = title;
    b.innerHTML = `<i class="ti ${icon}"></i>`;
    if ((action === 'up'   && idx === 0) ||
        (action === 'down' && idx === state.rows.length - 1)) {
      b.disabled = true;
    }
    b.addEventListener('click', () => _handleRowAction(action, row.id));
    return b;
  };

  bottom.appendChild(makeBtn('up',   'ti-chevron-up',   'Move up'));
  bottom.appendChild(makeBtn('down', 'ti-chevron-down', 'Move down'));
  const spacer = document.createElement('span');
  spacer.style.marginLeft = 'auto';
  bottom.appendChild(spacer);
  bottom.appendChild(makeBtn('del', 'ti-trash', 'Delete row', 'danger'));
  div.appendChild(bottom);

  // Drag events on the left row div
  _attachDragEvents(div, row.id);

  return div;
}

/* ── Right row (character cells) ───────────────────────────────── */

function _buildRightRow(row, state) {
  const div = document.createElement('div');
  div.className = 'right-row';
  div.dataset.rid = row.id;

  state.characters.forEach(ch => {
    const w    = _colWidth(ch.id);
    const cell = document.createElement('div');
    cell.className      = 'char-cell';
    cell.dataset.cid    = ch.id;
    cell.style.width    = w + 'px';
    cell.style.minWidth = w + 'px';
    cell.style.maxWidth = w + 'px';

    const ta = document.createElement('textarea');
    ta.placeholder = '—';
    ta.dataset.rid = row.id;
    ta.dataset.cid = ch.id;
    ta.textContent = row.cells[ch.id] || '';
    ta.addEventListener('input', e => {
      autoResize(e.target);
      const s = getState();
      const r = s.rows.find(r => r.id === row.id);
      if (r) { r.cells[ch.id] = e.target.value; saveState(s); }
      _syncSingleRowHeight(row.id);
    });

    cell.appendChild(ta);
    div.appendChild(cell);
  });

  return div;
}

/* ── Row height sync ───────────────────────────────────────────── */

/**
 * After rendering, ensure every left-row and its paired right-row
 * share the same height (the taller of the two).
 */
function syncRowHeights() {
  const state = getState();
  state.rows.forEach(row => _syncSingleRowHeight(row.id));
}

function _syncSingleRowHeight(rid) {
  const leftRow  = document.querySelector(`#panel-left-body  [data-rid="${rid}"]`);
  const rightRow = document.querySelector(`#right-rows       [data-rid="${rid}"]`);
  if (!leftRow || !rightRow) return;

  // Reset so we can measure natural heights
  leftRow.style.minHeight  = '';
  rightRow.style.minHeight = '';

  const h = Math.max(leftRow.scrollHeight, rightRow.scrollHeight);
  leftRow.style.minHeight  = h + 'px';
  rightRow.style.minHeight = h + 'px';
}

/* ── Vertical scroll sync ──────────────────────────────────────── */

function bindVerticalSync() {
  if (_syncBound) return;
  _syncBound = true;

  const rightBody = document.getElementById('panel-right-body');
  const leftBody  = document.getElementById('panel-left-body');

  // Sync right → left
  rightBody.addEventListener('scroll', () => {
    leftBody.scrollTop = rightBody.scrollTop;
    // Also sync the header horizontally
    document.getElementById('panel-right-head').scrollLeft = rightBody.scrollLeft;
  });
}

/* ── Drag & drop ───────────────────────────────────────────────── */

function _attachDragEvents(el, rid) {
  el.setAttribute('draggable', 'true');

  el.addEventListener('dragstart', e => {
    _dragSrcId = rid;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      el.classList.add('dragging');
      const rr = document.querySelector(`#right-rows [data-rid="${rid}"]`);
      if (rr) rr.style.opacity = '0.35';
    }, 0);
  });

  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    el.style.opacity = '';
    const rr = document.querySelector(`#right-rows [data-rid="${rid}"]`);
    if (rr) rr.style.opacity = '';
    _dragSrcId = null;
  });

  el.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Clear all drag-over states first
    document.querySelectorAll('.left-row').forEach(r => r.classList.remove('drag-over'));
    el.classList.add('drag-over');
  });

  el.addEventListener('dragleave', e => {
    if (!el.contains(e.relatedTarget)) el.classList.remove('drag-over');
  });

  el.addEventListener('drop', e => {
    e.preventDefault();
    el.classList.remove('drag-over');
    if (_dragSrcId && _dragSrcId !== rid) {
      const s    = getState();
      const from = s.rows.findIndex(r => r.id === _dragSrcId);
      const to   = s.rows.findIndex(r => r.id === rid);
      const [moved] = s.rows.splice(from, 1);
      s.rows.splice(to, 0, moved);
      setState(s);
    }
  });
}

/* ── Row actions ───────────────────────────────────────────────── */

function _handleRowAction(action, rid) {
  const s   = getState();
  const idx = s.rows.findIndex(r => r.id === rid);

  if (action === 'up' && idx > 0) {
    [s.rows[idx - 1], s.rows[idx]] = [s.rows[idx], s.rows[idx - 1]];
    setState(s);
  } else if (action === 'down' && idx < s.rows.length - 1) {
    [s.rows[idx], s.rows[idx + 1]] = [s.rows[idx + 1], s.rows[idx]];
    setState(s);
  } else if (action === 'del') {
    if (confirm('Delete this row?')) {
      s.rows.splice(idx, 1);
      setState(s);
    }
  }
}
