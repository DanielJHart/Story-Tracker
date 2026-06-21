/**
 * render.js
 *
 * Layout uses a single scroll container (#grid-outer) so vertical
 * scrolling works naturally across both the time column and character
 * columns. The time cell and header time cell are position:sticky
 * left:0 so they stay pinned while scrolling horizontally.
 *
 * Row backgrounds are tinted by event type; the sticky time cell
 * inherits that tint via `background: inherit`.
 */

const TYPES     = ['scene', 'chapter', 'note'];
const DEF_COL_W = 220;
const MIN_COL_W = 120;

let _dragSrcId = null;

/* ── Helpers ───────────────────────────────────────────────────── */

function autoResize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

function _colWidth(cid) {
  const s = getState();
  return (s.colWidths && s.colWidths[cid]) || DEF_COL_W;
}

/* ── Top-level render ──────────────────────────────────────────── */

function render() {
  renderHeader();
  renderBody();
}

/* ── Header ────────────────────────────────────────────────────── */

function renderHeader() {
  const state    = getState();
  const headChars = document.getElementById('head-chars');
  headChars.innerHTML = '';

  state.characters.forEach(ch => {
    const w    = _colWidth(ch.id);
    const cell = document.createElement('div');
    cell.className      = 'char-header';
    cell.dataset.cid    = ch.id;
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

    headChars.appendChild(cell);
  });

  // Character rename
  headChars.querySelectorAll('.char-name-input').forEach(inp => {
    inp.addEventListener('input', e => {
      const s  = getState();
      const ch = s.characters.find(c => c.id === e.target.dataset.cid);
      if (ch) { ch.name = e.target.value; saveState(s); }
    });
  });

  // Remove character
  headChars.querySelectorAll('.del-char').forEach(btn => {
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
  headChars.querySelectorAll('.col-resize-handle').forEach(h => {
    h.addEventListener('mousedown', _startColResize);
  });
}

/* ── Body ──────────────────────────────────────────────────────── */

function renderBody() {
  const state  = getState();
  const body   = document.getElementById('grid-body');
  body.innerHTML = '';

  if (state.rows.length === 0) {
    const empty = document.createElement('div');
    empty.className   = 'empty-state';
    empty.textContent = 'No events yet — add one below.';
    body.appendChild(empty);
    return;
  }

  state.rows.forEach((row, idx) => {
    body.appendChild(_buildRow(row, idx, state));
  });

  document.querySelectorAll('textarea').forEach(autoResize);
}

/* ── Build a single row ────────────────────────────────────────── */

function _buildRow(row, idx, state) {
  const rowEl = document.createElement('div');
  rowEl.className = `grid-row type-${row.type}`;
  rowEl.dataset.rid = row.id;

  // ── Time cell (sticky) ──
  const timeCell = document.createElement('div');
  timeCell.className = 'time-cell';

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
    // Update badge and row tint without a full re-render
    badge.className = `type-badge type-${r.type}`;
    badge.textContent = r.type;
    rowEl.className = `grid-row type-${r.type}`;
  });
  top.appendChild(badge);
  timeCell.appendChild(top);

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
  });
  timeCell.appendChild(ta);

  // Bottom: move up/down + delete
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
  timeCell.appendChild(bottom);

  rowEl.appendChild(timeCell);

  // ── Character cells ──
  state.characters.forEach(ch => {
    const w    = _colWidth(ch.id);
    const cell = document.createElement('div');
    cell.className      = 'char-cell';
    cell.dataset.cid    = ch.id;
    cell.style.width    = w + 'px';
    cell.style.minWidth = w + 'px';
    cell.style.maxWidth = w + 'px';

    const cta = document.createElement('textarea');
    cta.placeholder = '—';
    cta.dataset.rid = row.id;
    cta.dataset.cid = ch.id;
    cta.textContent = row.cells[ch.id] || '';
    cta.addEventListener('input', e => {
      autoResize(e.target);
      const s = getState();
      const r = s.rows.find(r => r.id === row.id);
      if (r) { r.cells[ch.id] = e.target.value; saveState(s); }
    });

    cell.appendChild(cta);
    rowEl.appendChild(cell);
  });

  // ── Drag & drop ──
  rowEl.setAttribute('draggable', 'true');

  rowEl.addEventListener('dragstart', e => {
    _dragSrcId = row.id;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => rowEl.classList.add('dragging'), 0);
  });
  rowEl.addEventListener('dragend', () => {
    rowEl.classList.remove('dragging');
    _dragSrcId = null;
  });
  rowEl.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.grid-row').forEach(r => r.classList.remove('drag-over'));
    rowEl.classList.add('drag-over');
  });
  rowEl.addEventListener('dragleave', e => {
    if (!rowEl.contains(e.relatedTarget)) rowEl.classList.remove('drag-over');
  });
  rowEl.addEventListener('drop', e => {
    e.preventDefault();
    rowEl.classList.remove('drag-over');
    if (_dragSrcId && _dragSrcId !== row.id) {
      const s    = getState();
      const from = s.rows.findIndex(r => r.id === _dragSrcId);
      const to   = s.rows.findIndex(r => r.id === row.id);
      const [moved] = s.rows.splice(from, 1);
      s.rows.splice(to, 0, moved);
      setState(s);
    }
  });

  return rowEl;
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

/* ── Column resize ─────────────────────────────────────────────── */

function _applyColWidth(cid, w) {
  const px = w + 'px';
  const header = document.querySelector(`.char-header[data-cid="${cid}"]`);
  if (header) {
    header.style.width    = px;
    header.style.minWidth = px;
    header.style.maxWidth = px;
  }
  document.querySelectorAll(`.char-cell[data-cid="${cid}"]`).forEach(cell => {
    cell.style.width    = px;
    cell.style.minWidth = px;
    cell.style.maxWidth = px;
  });
}

function _startColResize(e) {
  e.preventDefault();
  const cid    = e.currentTarget.dataset.cid;
  const startX = e.clientX;
  const startW = _colWidth(cid);
  const handle = e.currentTarget;

  handle.classList.add('resizing');
  document.body.classList.add('col-resizing');

  function onMove(e) {
    const w = Math.max(MIN_COL_W, startW + (e.clientX - startX));
    _applyColWidth(cid, w);
  }

  function onUp(e) {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',   onUp);
    handle.classList.remove('resizing');
    document.body.classList.remove('col-resizing');

    const w = Math.max(MIN_COL_W, startW + (e.clientX - startX));
    const s = getState();
    if (!s.colWidths) s.colWidths = {};
    s.colWidths[cid] = w;
    saveState(s);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onUp);
}
