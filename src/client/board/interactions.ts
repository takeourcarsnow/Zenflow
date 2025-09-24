// Converted from js/board/interactions.js
(function(){
  'use strict';
  const w: any = window as any;
  const { showNotification } = w.Notifications || {};

  const proto = w.KanbanBoard && w.KanbanBoard.prototype;
  if (!proto) return;

  proto.attachDragListeners = function(container: HTMLElement) {
    let rafId = 0;
    container.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      if (rafId) return;
      const containerEl = e.currentTarget as HTMLElement;
      const y = e.clientY;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        this._handleDragOverFrame(containerEl, y);
      });
    });
    container.addEventListener('drop', (e: DragEvent) => this.handleDrop(e));
    container.addEventListener('dragleave', (e: DragEvent) => this.handleDragLeave(e));

    if (!((container as any).__dragDelegated)) {
      container.addEventListener('dragstart', (e: DragEvent) => {
        const card = (e.target as HTMLElement)?.closest?.('.card');
        if (!card) return;
        this.handleDragStart({ target: card, dataTransfer: (e as any).dataTransfer });
      });
      container.addEventListener('dragend', (e: DragEvent) => {
        const card = (e.target as HTMLElement)?.closest?.('.card');
        if (!card) return;
        this.handleDragEnd();
      });

      container.addEventListener('click', (e: MouseEvent) => {
        const card = (e.target as HTMLElement)?.closest?.('.card');
        if (!card) return;
        if ((e.target as HTMLElement).closest('.card-mobile-controls') || (e.target as HTMLElement).closest('.menu-btn') || (e.target as HTMLElement).closest('button, a, input, textarea, select, label')) return;
        const now = Date.now();
        if (this._lastDragAt && (now - this._lastDragAt) < 200) return;
        const id = card.getAttribute('data-card-id');
        const col = card.getAttribute('data-column');
        this.editCard(id, col);
      });
      container.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key !== 'Enter') return;
        const el = (e.target as HTMLElement)?.closest?.('.card');
        if (!el) return;
        if ((e.target as HTMLElement).closest('.card-mobile-controls') || (e.target as HTMLElement).closest('.menu-btn') || (e.target as HTMLElement).closest('button, a, input, textarea, select, label')) return;
        e.preventDefault();
        const id = el.getAttribute('data-card-id');
        const col = el.getAttribute('data-column');
        this.editCard(id, col);
      });

      (container as any).__dragDelegated = true;
    }
  };

  proto.handleDragStart = function(e:any) {
    this.draggedCard = e.target.closest('.card');
    if (!this.draggedCard) return;
    this.draggedCard.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', this.draggedCard.getAttribute('data-card-id')); } catch {}
    this._lastDragAt = Date.now();
  };
  proto.handleDragEnd = function() {
    if (this.draggedCard) this.draggedCard.classList.remove('dragging');
    this.draggedCard = null;
  };

  proto._handleDragOverFrame = function(container: HTMLElement, clientY: number) {
    container.classList.add('drag-over');
    const columnEl = container.closest('.column');
    (columnEl as HTMLElement)?.classList.add('drag-over-col');

    try {
      const rect = container.getBoundingClientRect();
      const edge = Math.max(20, Math.min(60, rect.height * 0.1));
      let delta = 0;
      if (clientY < rect.top + edge) delta = -Math.ceil((edge - (clientY - rect.top)) / 6);
      else if (clientY > rect.bottom - edge) delta = Math.ceil((edge - (rect.bottom - clientY)) / 6);
      if (delta !== 0) container.scrollTop += delta;
    } catch {}

    const canReorder = (container.getAttribute('data-reorder') === 'true');
    if (!canReorder) return;

    const afterElement = this.getDragAfterElement(container, clientY);
    if (!this.draggedCard) return;
    if (afterElement == null) {
      if (container.lastElementChild !== this.draggedCard) container.appendChild(this.draggedCard);
    } else {
      if (this.draggedCard.nextElementSibling !== afterElement) container.insertBefore(this.draggedCard, afterElement);
    }
  };

  proto.handleDragOver = function(e:any) {
    e?.preventDefault?.();
    const container = e?.currentTarget;
    if (!container) return;
    this._handleDragOverFrame(container, e.clientY);
  };
  proto.handleDragLeave = function(e:any) {
    const container = e.currentTarget as HTMLElement;
    if (!container.classList.contains('cards-container')) return;
    const rect = container.getBoundingClientRect();
    const { clientX: x, clientY: y } = e as any;
    const outside = x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
    if (outside) {
      container.classList.remove('drag-over');
      const columnEl = container.closest('.column');
      (columnEl as HTMLElement)?.classList.remove('drag-over-col');
    }
  };

  proto.handleDrop = function(e:any) {
    e.preventDefault();
    const container = e.currentTarget as HTMLElement;
    container.classList.remove('drag-over');
    const columnEl = container.closest('.column');
    (columnEl as HTMLElement)?.classList.remove('drag-over-col');
    if (!this.draggedCard) return;

    const cardId = this.draggedCard.getAttribute('data-card-id');
    const sourceColumn = this.draggedCard.getAttribute('data-column');
    const targetColumn = container.getAttribute('data-column');

    this.saveSnapshot();

    const card = this.removeCardFromColumn(cardId, sourceColumn);
    if (!card) return;

    this.draggedCard.setAttribute('data-column', targetColumn);

    const canReorder = container.getAttribute('data-reorder') === 'true';

    if (canReorder && this.sorts[targetColumn] !== 'manual') {
      this.sorts[targetColumn] = 'manual';
      this.savePrefs();
      showNotification?.('Sort changed', `Switched ${this.columns.find((c:any)=>c.id===targetColumn).title} to manual for your custom order.`, null, 'info');
    }

    if (canReorder) {
      const orderIds = Array.from(container.querySelectorAll('.card')).map((c:any) => c.getAttribute('data-card-id'));
      const cardsMap = new Map([[card.id, card], ...this.boards[targetColumn].map((c:any)=>[c.id,c])]);
      this.boards[targetColumn] = orderIds.map(id => cardsMap.get(id)).filter(Boolean);
    } else {
      const draggedEl = this.draggedCard;
      if (draggedEl && draggedEl.parentElement) draggedEl.parentElement.removeChild(draggedEl);
      if (this.matchesActiveFilters(card)) {
        container.appendChild(this.draggedCard);
        const el = this.draggedCard;
        el.classList.remove('just-moved');
        void (el as HTMLElement).offsetWidth;
        el.classList.add('just-moved');
        setTimeout(() => el.classList.remove('just-moved'), 220);
      }
      this.boards[targetColumn].push(card);
    }

    this.saveData();
    this.updateColumnHeaderCount(sourceColumn);
    this.updateColumnHeaderCount(targetColumn);
    this.updateStats();

    showNotification?.('Task moved', `Moved to ${this.columns.find((c:any)=>c.id===targetColumn).title}`, {
      actionLabel: 'Undo',
      onAction: () => this.undo()
    });

    this.warnIfOverWip(targetColumn);
  };

  proto.getDragAfterElement = function(container: HTMLElement, y:number) {
    const nodeList = Array.from(container.querySelectorAll('.card:not(.dragging)')) as HTMLElement[];
    return nodeList.reduce((closest:any, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  };

  proto.moveCardToAdjacentColumn = function(cardId:string, currentColumnId:string, direction = 1) {
    const order = this.columns.map((c:any) => c.id);
    const fromIdx = order.indexOf(currentColumnId);
    if (fromIdx === -1) return;
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= order.length) return;
    const target = order[toIdx];

    this.saveSnapshot();
    const card = this.removeCardFromColumn(cardId, currentColumnId);
    if (!card) return;

    this.boards[target].push(card);
    this.saveData();

    try {
      const cardEl = document.querySelector(`.card[data-card-id="${cardId}"]`);
      const targetContainer = document.querySelector(`.cards-container[data-column="${target}"]`);
      if (cardEl) {
        if (!this.matchesActiveFilters(card)) {
          cardEl.remove();
        } else if (targetContainer) {
          targetContainer.appendChild(cardEl);
          (cardEl as HTMLElement).setAttribute('data-column', target);
          cardEl.classList.remove('just-moved');
          void (cardEl as HTMLElement).offsetWidth;
          cardEl.classList.add('just-moved');
          setTimeout(() => cardEl.classList.remove('just-moved'), 220);
        }
      }
      if (this.sorts[target] !== 'manual') this.reorderColumnDomToCurrentSort(target);
    } catch {}

    this.updateColumnHeaderCount(currentColumnId);
    this.updateColumnHeaderCount(target);
    this.updateStats();

    showNotification?.('Task moved', `Moved to ${this.columns[toIdx].title}`, {
      actionLabel: 'Undo',
      onAction: () => this.undo()
    });

    this.warnIfOverWip(target);
  };
})();
