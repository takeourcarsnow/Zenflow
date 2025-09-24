// Converted from js/board/filters.js
(function(){
  'use strict';
  const w: any = window as any;
  const { priorityOrder } = w.Utils || {};
  const { showNotification } = w.Notifications || {};

  const proto = w.KanbanBoard && w.KanbanBoard.prototype;
  if (!proto) return;

  proto.searchCards = function(term:string) {
    this.searchTerm = (term || '').toLowerCase();
    this._searchRegex = null; this._searchRegexTerm = null;
    this.renderBoard();
  };

  proto.setFilters = function(filters:any) {
    this.filters = filters;
    this.savePrefs?.();
    this.renderBoard();
    this.updateFilterBadge();
  };

  proto.getVisibleCards = function(columnId:string) {
    let cards = [...this.boards[columnId]];
    cards = this.sortCards(cards, this.sorts[columnId]);
    cards = cards.filter((card:any) => this.matchesActiveFilters(card));
    return cards;
  };

  proto._ensureHaystack = function(card:any) {
    try {
      if (!card) return '';
      if (!card.__lcHay || card.__hayVer !== 1) {
        card.__lcHay = `${(card.title||'')}\n${(card.description||'')}\n${(card.category||'')}`.toLowerCase();
        card.__hayVer = 1;
      }
      return card.__lcHay;
    } catch { return `${card?.title||''}`.toLowerCase(); }
  };

  proto.matchesActiveFilters = function(card:any) {
    try {
      if (!card) return false;
      if (this.searchTerm) {
        const hay = this._ensureHaystack(card);
        if (!hay.includes(this.searchTerm)) return false;
      }
      if (!this.filters.priorities.has(card.priority)) return false;
      if (this.filters.category.trim()) {
        if (!(card.category || '').toLowerCase().includes(this.filters.category.toLowerCase().trim())) return false;
      }
      const dueFilter = this.filters.due;
      if (dueFilter !== 'all') {
        const hasDue = !!card.dueDate;
        const today = new Date(); today.setHours(0,0,0,0);
        if (dueFilter === 'none' && hasDue) return false;
        if (dueFilter === 'overdue') {
          if (!hasDue) return false;
          const d = new Date(card.dueDate); d.setHours(0,0,0,0);
          if (!(d < today)) return false;
        }
        if (dueFilter === 'today') {
          if (!hasDue) return false;
          const d = new Date(card.dueDate); d.setHours(0,0,0,0);
          if (d.getTime() !== today.getTime()) return false;
        }
        if (dueFilter === 'week') {
          if (!hasDue) return false;
          const d = new Date(card.dueDate); d.setHours(0,0,0,0);
          const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diff < 0 || diff > 7) return false;
        }
      }
      return true;
    } catch { return true; }
  };

  proto.updateFilterBadge = function() {
    const active = this.isAnyFilterActive();
    const badge = document.getElementById('filterBadge');
    if (!badge) return;
    badge.style.display = active ? 'inline-flex' : 'none';
    badge.textContent = active ? '•' : '';
  };

  proto.sortCards = function(cards:any[], sort:string) {
    if (sort === 'manual') return cards;
    const sorted = [...cards];
    if (sort === 'priority') {
      sorted.sort((a:any,b:any) => ((priorityOrder && priorityOrder[a.priority]) ?? 99) - ((priorityOrder && priorityOrder[b.priority]) ?? 99) || this.compareByCreated(a,b));
    } else if (sort === 'due') {
      sorted.sort((a:any,b:any) => {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd || this.compareByCreated(a,b);
      });
    } else if (sort === 'title') {
      sorted.sort((a:any,b:any) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));
    } else if (sort === 'created') {
      sorted.sort((a:any,b:any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return sorted;
  };
  proto.compareByCreated = function(a:any,b:any) { return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); };

  proto.changeColumnSort = function(columnId:string, sortKey:string) {
    this.sorts[columnId] = sortKey;
    this.savePrefs?.();
    this.renderBoard();
    const col = this.columns.find((c:any) => c.id === columnId);
    if (col) {
      showNotification?.('Sort changed', `Sorted ${col.title} by ${sortKey}`);
    }
  };
})();
