// Converted from js/board/render.js
(function(){
  'use strict';
  const w: any = window as any;
  const { escapeHTML, formatDate, isOverdue, escapeRegExp, priorityOrder } = w.Utils || {};

  const proto = w.KanbanBoard && w.KanbanBoard.prototype;
  if (!proto) return;

  proto.renderBoard = function() {
    const board = document.getElementById('board');
    if (!board) return;
    try { console.log('renderBoard: columns', this.columns.map((c:any)=>c.id), 'counts', this.columns.map((c:any)=> (this.boards[c.id] || []).length)); } catch (e) {}
    const frag = document.createDocumentFragment();
    this.columns.forEach((col:any) => {
      const colEl = this.createColumnElement(col);
      frag.appendChild(colEl);
    });
    board.innerHTML = '';
    board.appendChild(frag);
    this.updateAllCounts();
    try { this.updateStats?.(); } catch {}
  };

  proto.createColumnElement = function(column:any) {
    const colDiv = document.createElement('section');
    colDiv.className = 'column' + (this.collapsed[column.id] ? ' collapsed' : '');
    colDiv.dataset.columnId = column.id;
    colDiv.setAttribute('aria-label', column.title);
    try {
      if (column.color) {
        colDiv.style.setProperty('--col-accent', column.color);
        colDiv.style.setProperty('--col-ring', 'color-mix(in oklab, var(--col-accent) 35%, transparent)');
      }
    } catch {}
    colDiv.innerHTML = this.getColumnMarkup(column);
    this.wireColumnBehaviors?.(colDiv, column.id);
    return colDiv;
  };

  proto.getColumnMarkup = function(column:any) {
    const cards = this.getVisibleCards(column.id);
    try { console.log('getColumnMarkup', column.id, 'visible', cards.length, 'sample:', cards.slice(0,2)); } catch (e) {}
    const canReorder = this.canReorderColumn(column.id);
    return `
      <div class="column-header">
        <div class="column-title">
          <div class="column-icon" aria-hidden="true">${column.icon}</div>
          <span>${column.title}</span>
          <span class="column-count" id="count-${column.id}">${this.formatCountWithLimit(column.id, cards.length)}</span>
        </div>
        <div class="column-menu">
          <button class="menu-btn add-card-top" title="Add task" aria-label="Add task to ${column.title}" onclick="showAddCardModal('${column.id}')">➕</button>
          <button class="menu-btn" title="Column options" aria-haspopup="true" aria-expanded="false" data-action="toggle-menu">⋮</button>
          <div class="menu-dropdown" role="menu">
            <div class="menu-group-label">Sort</div>
            <button class="menu-item" data-action="sort" data-sort="manual">${this.sorts[column.id] === 'manual' ? '✅ ' : ''}Manual</button>
            <button class="menu-item" data-action="sort" data-sort="priority">${this.sorts[column.id] === 'priority' ? '✅ ' : ''}Priority</button>
            <button class="menu-item" data-action="sort" data-sort="due">${this.sorts[column.id] === 'due' ? '✅ ' : ''}Due date</button>
            <button class="menu-item" data-action="sort" data-sort="title">${this.sorts[column.id] === 'title' ? '✅ ' : ''}Title</button>
            <button class="menu-item" data-action="sort" data-sort="created">${this.sorts[column.id] === 'created' ? '✅ ' : ''}Created</button>
            <div class="menu-group-label">Column</div>
            <button class="menu-item" data-action="toggle-collapse">${this.collapsed[column.id] ? '📂 Expand' : '📁 Collapse'}</button>
            <button class="menu-item" data-action="clear-column" data-column="${column.id}">🧹 Clear column</button>
            <button class="menu-item" data-action="customize-columns">⚙️ Customize columns…</button>
            <div class="menu-group-label">WIP</div>
            <button class="menu-item" data-action="set-wip" data-column="${column.id}">🎯 Set WIP limit…</button>
            ${this.wipLimits[column.id] ? `<button class="menu-item" data-action="clear-wip" data-column="${column.id}">✖️ Clear WIP limit (${this.wipLimits[column.id]})</button>` : ''}
          </div>
        </div>
      </div>
      <div class="cards-container ${canReorder ? '' : 'drag-disabled'}" data-column="${column.id}" data-reorder="${canReorder}">
        ${this.renderCards(cards, column.id, canReorder)}
      </div>
      <button class="add-card-btn" onclick="showAddCardModal('${column.id}')" aria-label="Add task to ${column.title}">
        <span>➕</span> Add Task
      </button>
    `;
  };

  proto.renderCards = function(cards:any[], columnId:string, canReorder:boolean) {
    return cards.map(card => this.createCardHTML(card, columnId, canReorder)).join('');
  };

  proto.highlightAndEscape = function(text:string) {
    const safe = escapeHTML ? escapeHTML(text || '') : (text || '');
    if (!this.searchTerm) return safe;
    if (!this._searchRegex || this._searchRegexTerm !== this.searchTerm) {
      this._searchRegexTerm = this.searchTerm;
      const esc = (escapeRegExp ? escapeRegExp(this.searchTerm) : this.searchTerm);
      this._searchRegex = new RegExp(`(${esc})`, 'gi');
    }
    return safe.replace(this._searchRegex, '<mark>$1</mark>');
  };

  proto.createCardHTML = function(card:any, columnId:string, canReorder:boolean) {
    const priorityClass = `tag-priority-${card.priority}`;
    const dueDate = card.dueDate ? new Date(card.dueDate) : null;
    const isOver = dueDate && (isOverdue ? isOverdue(dueDate) : false) && columnId !== 'done';
    const draggableAttr = 'draggable="true"';
    const tabIndex = 0;

    return `
      <article class="card" ${draggableAttr} tabindex="${tabIndex}" role="listitem" data-card-id="${card.id}" data-column="${columnId}" aria-label="${escapeHTML ? escapeHTML(card.title) : (card.title||'')}">
        <div class="card-header">
          <div class="card-title">${this.highlightAndEscape(card.title)}</div>
          <div class="card-menu">
            <button class="menu-btn" title="Edit task" onclick="app.editCard('${card.id}', '${columnId}')">✏️</button>
          </div>
        </div>
        ${card.description ? `<div class="card-description">${this.highlightAndEscape(card.description)}</div>` : ''}
        <div class="card-meta">
          <span class="card-tag ${priorityClass}">${escapeHTML ? escapeHTML(card.priority) : card.priority}</span>
          ${card.category ? `<span class="card-tag tag-category">${this.highlightAndEscape(card.category)}</span>` : ''}
          ${isOver ? '<span class="card-tag tag-priority-high">Overdue</span>' : ''}
        </div>
        <div class="card-footer">
          <button class="btn btn-ghost move-prev"
            onclick="event.stopPropagation(); app.moveCardToAdjacentColumn('${card.id}', '${columnId}', -1)"
            onmousedown="event.stopPropagation();" onkeydown="event.stopPropagation();"
            aria-label="Move to previous column" title="Move to previous column">⬆️</button>
          <button class="btn btn-ghost move-next"
            onclick="event.stopPropagation(); app.moveCardToAdjacentColumn('${card.id}', '${columnId}', 1)"
            onmousedown="event.stopPropagation();" onkeydown="event.stopPropagation();"
            aria-label="Move to next column" title="Move to next column">⬇️</button>
          <div class="card-info" style="margin-left:auto;">
            ${card.dueDate ? `<div class=\"card-date\">📅 ${(formatDate ? formatDate(card.dueDate) : card.dueDate)}</div>` : ''}
          </div>
        </div>
      </article>
    `;
  };

  proto.refreshColumn = function(columnId:string) {
    try {
      const col = this.columns.find((c:any) => c.id === columnId);
      const section = document.querySelector(`section.column[data-column-id="${columnId}"]`);
      if (!col || !section) return;
      section.innerHTML = this.getColumnMarkup(col);
      this.wireColumnBehaviors?.(section, columnId);
      this.updateAllCounts();
    } catch {}
  };

  proto.updateColumnHeaderCount = function(columnId:string) {
    try {
      const visible = this.getVisibleCards(columnId).length;
      const limit = this.wipLimits[columnId];
      const total = this.boards[columnId].length;
      const over = Number.isFinite(limit) && limit > 0 && total > limit;
      const countEl = document.getElementById(`count-${columnId}`);
      if (countEl) {
        countEl.textContent = this.formatCountWithLimit(columnId, visible);
        countEl.classList.toggle('over', over);
      }
      const colSection = document.querySelector(`section.column[data-column-id="${columnId}"]`);
      if (colSection) colSection.classList.toggle('over-limit', over);
    } catch {}
  };

  proto.updateAllCounts = function() {
    this.columns.forEach((column:any) => {
      const visible = this.getVisibleCards(column.id).length;
      const limit = this.wipLimits[column.id];
      const total = this.boards[column.id].length;
      const over = Number.isFinite(limit) && limit > 0 && total > limit;
      const countEl = document.getElementById(`count-${column.id}`);
      if (countEl) {
        countEl.textContent = this.formatCountWithLimit(column.id, visible);
        countEl.classList.toggle('over', over);
      }
      const colSection = document.querySelector(`section.column[data-column-id="${column.id}"]`);
      if (colSection) colSection.classList.toggle('over-limit', over);
    });
  };

  proto.reorderColumnDomToCurrentSort = function(columnId:string) {
    try {
      const container = document.querySelector(`.cards-container[data-column="${columnId}"]`);
      if (!container) return;
      const orderedIds = this.getVisibleCards(columnId).map((c:any) => c.id);
      const map = new Map();
  container.querySelectorAll('.card').forEach(el => map.set((el as HTMLElement).dataset.cardId, el));
      orderedIds.forEach(id => {
        const el = map.get(id);
        if (el) container.appendChild(el);
      });
    } catch {}
  };

  proto.updateBottomNavUI = function() {
    try {
      const nav = document.getElementById('bottomNav');
      if (!nav) return;
      nav.innerHTML = this.columns.map((c:any) => `
        <button class="bn-item" data-target="${c.id}" onclick="scrollToColumn('${c.id}')" aria-label="Go to ${c.title}" style="${c.color ? `--bn-active:${c.color};` : ''}">
          <span class="bn-icon" aria-hidden="true">${c.icon}</span>
          <span class="bn-label">${c.title}</span>
        </button>
      `).join('');
    } catch {}
  };

  proto.updateColumnSelectOptions = function() {
    try {
      const sel = document.getElementById('cardColumn') as HTMLSelectElement | null;
      if (!sel) return;
      sel.innerHTML = this.columns.map((c:any) => `<option value="${c.id}">${c.icon} ${c.title}</option>`).join('');
      const desired = this.currentEditCard ? null : 'longterm';
      if (this.currentEditCard) sel.value = Object.keys(this.boards).find(k => this.boards[k].some((x:any) => x.id === this.currentEditCard.id)) || this.columns[0].id;
      else if (desired && this.columns.some((c:any) => c.id === desired)) sel.value = desired;
      window.SelectEnhancer?.refresh(sel);
    } catch {}
  };
})();
