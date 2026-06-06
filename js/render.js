/**
 * render.js
 * Responsible for building the DOM from the current state.
 * Called by setState() and directly on init.
 */

const TYPES = ['scene', 'chapter', 'note'];

let _dragSrcId = null;

/** Auto-expand a textarea to fit its content. */
function autoResize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

/** Top-level render: re-draws header and body. */
function render() {
  renderHeader();
  renderBody();
}

// ── Header ─────────────────────────────────────────────────────────

function renderHeader() {
  const state = getState();
  const headerRow = document.getElementById('header-row');
  headerRow.innerHTML = '';

  // Time column
  const th0 = document.createElement('th');
  th0.innerHTML = `<div class="th-inner"><i class="ti ti-clock" style="font-size:14px"></i> Time / Event</div>`;
  headerRow.appendChild(th0);

  // One column per character
  state.characters.forEach(ch => {
    const th = document.createElement('th');
    th.innerHTML = `
      <div class="th-inner">
        <i class="ti ti-user-circle" style="font-size:15px;flex-shrink:0"></i>
        <input class="char-name-input"
               value="${escHtml(ch.name)}"
               placeholder="Name…"
               data-cid="${ch.id}" />
        <button class="del-char" data-cid="${ch.id}" title="Remove character">
          <i class="ti ti-x"></i>
        </button>
      </div>`;
    headerRow.appendChild(th);
  });

  // Events: character rename
  headerRow.querySelectorAll('.char-name-input').forEach(inp => {
    inp.addEventListener('input', e => {
      const s = getState();
      const ch = s.characters.find(c => c.id === e.target.dataset.cid);
      if (ch) { ch.name = e.target.value; setState(s); }
    });
  });

  // Events: remove character
  headerRow.querySelectorAll('.del-char').forEach(btn => {
    btn.addEventListener('click', e => {
      if (getState().characters.length <= 1) {
        alert('You need at least one character column.');
        return;
      }
      if (!confirm('Remove this character and all their data?')) return;
      const cid = e.currentTarget.dataset.cid;
      const s = getState();
      s.characters = s.characters.filter(c => c.id !== cid);
      s.rows.forEach(r => delete r.cells[cid]);
      setState(s);
    });
  });
}

// ── Body ────────────────────────────────────────────────────────────

function renderBody() {
  const state = getState();
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';

  if (state.rows.length === 0) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    tr.innerHTML = `<td colspan="${state.characters.length + 1}">No events yet — add one below.</td>`;
    tbody.appendChild(tr);
    return;
  }

  state.rows.forEach((row, idx) => {
    const tr = _buildRow(row, idx, state);
    tbody.appendChild(tr);
  });

  // Auto-resize all textareas after DOM insertion
  tbody.querySelectorAll('textarea').forEach(autoResize);
}

function _buildRow(row, idx, state) {
  const tr = document.createElement('tr');
  tr.dataset.rid = row.id;
  tr.setAttribute('draggable', 'true');

  // ── Time cell ──
  const tdTime = document.createElement('td');
  tdTime.className = 'time-cell';
  tdTime.appendChild(_buildTimeCell(row, idx, state));
  tr.appendChild(tdTime);

  // ── Character cells ──
  state.characters.forEach(ch => {
    const td = document.createElement('td');
    const inner = document.createElement('div');
    inner.className = 'cell-inner';
    const ta = document.createElement('textarea');
    ta.placeholder = '—';
    ta.dataset.rid = row.id;
    ta.dataset.cid = ch.id;
    ta.textContent = row.cells[ch.id] || '';
    ta.addEventListener('input', e => {
      autoResize(e.target);
      const s = getState();
      const r = s.rows.find(r => r.id === row.id);
      if (r) { r.cells[ch.id] = e.target.value; setState(s); }
    });
    inner.appendChild(ta);
    td.appendChild(inner);
    tr.appendChild(td);
  });

  // ── Drag & drop ──
  tr.addEventListener('dragstart', e => {
    _dragSrcId = row.id;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => tr.classList.add('dragging'), 0);
  });
  tr.addEventListener('dragend', () => {
    tr.classList.remove('dragging');
    _dragSrcId = null;
  });
  tr.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('tbody tr').forEach(r => r.classList.remove('drag-over'));
    tr.classList.add('drag-over');
  });
  tr.addEventListener('dragleave', e => {
    if (!tr.contains(e.relatedTarget)) tr.classList.remove('drag-over');
  });
  tr.addEventListener('drop', e => {
    e.preventDefault();
    tr.classList.remove('drag-over');
    if (_dragSrcId && _dragSrcId !== row.id) {
      const s = getState();
      const from = s.rows.findIndex(r => r.id === _dragSrcId);
      const to   = s.rows.findIndex(r => r.id === row.id);
      const [moved] = s.rows.splice(from, 1);
      s.rows.splice(to, 0, moved);
      setState(s);
    }
  });

  return tr;
}

function _buildTimeCell(row, idx, state) {
  const inner = document.createElement('div');
  inner.className = 'cell-inner';

  // Top row: drag handle + type badge
  const top = document.createElement('div');
  top.className = 'time-top';

  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.title = 'Drag to reorder';
  handle.innerHTML = '<i class="ti ti-grip-vertical"></i>';
  top.appendChild(handle);

  const badge = document.createElement('span');
  badge.className = `type-badge type-${row.type}`;
  badge.dataset.rid = row.id;
  badge.title = 'Click to cycle type';
  badge.textContent = row.type;
  badge.addEventListener('click', e => {
    const s = getState();
    const r = s.rows.find(r => r.id === row.id);
    if (r) {
      r.type = TYPES[(TYPES.indexOf(r.type) + 1) % TYPES.length];
      setState(s);
    }
  });
  top.appendChild(badge);
  inner.appendChild(top);

  // Textarea for time label
  const ta = document.createElement('textarea');
  ta.placeholder = 'e.g. Chapter 3, dawn…';
  ta.dataset.rid = row.id;
  ta.dataset.field = 'time';
  ta.textContent = row.time || '';
  ta.addEventListener('input', e => {
    autoResize(e.target);
    const s = getState();
    const r = s.rows.find(r => r.id === row.id);
    if (r) { r.time = e.target.value; setState(s); }
  });
  inner.appendChild(ta);

  // Bottom row: move up/down + delete
  const bottom = document.createElement('div');
  bottom.className = 'time-bottom';

  const makeBtn = (action, icon, title, cls = '') => {
    const b = document.createElement('button');
    b.className = `row-btn${cls ? ' ' + cls : ''}`;
    b.dataset.action = action;
    b.dataset.rid = row.id;
    b.title = title;
    b.innerHTML = `<i class="ti ${icon}"></i>`;
    if ((action === 'up' && idx === 0) || (action === 'down' && idx === state.rows.length - 1)) {
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
  inner.appendChild(bottom);

  return inner;
}

function _handleRowAction(action, rid) {
  const s = getState();
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
