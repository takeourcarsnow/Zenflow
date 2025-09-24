// Converted from js/board/ui_and_events.js
(function(){
  'use strict';
  const w: any = window as any;
  const { escapeHTML, isOverdue, formatDate, escapeRegExp } = w.Utils || {};
  const { showNotification } = w.Notifications || {};

  const proto = w.KanbanBoard && w.KanbanBoard.prototype;
  if (!proto) return;

  proto.wireColumnBehaviors = function(colSection: HTMLElement, columnId: string) {
    const container = colSection.querySelector('.cards-container') as HTMLElement | null;
    if (container) this.attachDragListeners?.(container);

    const menuBtn = colSection.querySelector('.menu-btn[data-action="toggle-menu"]') as HTMLElement | null;
    const dropdown = colSection.querySelector('.menu-dropdown') as HTMLElement | null;
    if (!menuBtn || !dropdown) return;
    menuBtn.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('open');
      document.querySelectorAll('.menu-dropdown.open').forEach(d => {
        if (d !== dropdown) {
          d.classList.remove('open');
          const btn = (d.closest('.column-header') as HTMLElement)?.querySelector('.menu-btn[data-action="toggle-menu"]') as HTMLElement | null;
          btn?.setAttribute('aria-expanded','false');
          if ((d as any).__outsideHandler) { document.removeEventListener('click', (d as any).__outsideHandler, true); (d as any).__outsideHandler = null; }
          if ((d as any).__escHandler) { document.removeEventListener('keydown', (d as any).__escHandler, true); (d as any).__escHandler = null; }
        }
      });
      const willOpen = !isOpen;
      dropdown.classList.toggle('open', willOpen);
      menuBtn.setAttribute('aria-expanded', String(willOpen));
      const ensureHandlers = (open: boolean) => {
        if (open) {
          const outside = (evt: Event) => {
            const t = evt.target as Node;
            const clickedInside = dropdown.contains(t) || menuBtn.contains(t);
            if (!clickedInside) {
              dropdown.classList.remove('open');
              menuBtn.setAttribute('aria-expanded','false');
              document.removeEventListener('click', outside, true);
              document.removeEventListener('touchstart', outside, true);
              document.removeEventListener('pointerdown', outside, true);
              document.removeEventListener('keydown', esc, true);
              (dropdown as any).__outsideHandler = null; (dropdown as any).__escHandler = null;
            }
          };
          const esc = (evt: KeyboardEvent) => {
            if (evt.key === 'Escape') {
              dropdown.classList.remove('open');
              menuBtn.setAttribute('aria-expanded','false');
              document.removeEventListener('click', outside, true);
              document.removeEventListener('touchstart', outside, true);
              document.removeEventListener('pointerdown', outside, true);
              document.removeEventListener('keydown', esc, true);
              (dropdown as any).__outsideHandler = null; (dropdown as any).__escHandler = null;
            }
          };
          (dropdown as any).__outsideHandler = outside;
          (dropdown as any).__escHandler = esc;
          document.addEventListener('click', outside, true);
          document.addEventListener('touchstart', outside, true);
          document.addEventListener('pointerdown', outside, true);
          document.addEventListener('keydown', esc, true);
        } else {
          if ((dropdown as any).__outsideHandler) { document.removeEventListener('click', (dropdown as any).__outsideHandler, true); document.removeEventListener('touchstart', (dropdown as any).__outsideHandler, true); document.removeEventListener('pointerdown', (dropdown as any).__outsideHandler, true); (dropdown as any).__outsideHandler = null; }
          if ((dropdown as any).__escHandler) { document.removeEventListener('keydown', (dropdown as any).__escHandler, true); (dropdown as any).__escHandler = null; }
        }
      };
      ensureHandlers(willOpen);
    });

    dropdown.addEventListener('click', (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.menu-item') as HTMLElement | null;
      if (!target) return;
      const action = target.dataset.action;
      if (action === 'sort') {
        const sortKey = target.dataset.sort;
        this.changeColumnSort?.(columnId, sortKey);
        dropdown.classList.remove('open');
      } else if (action === 'clear-column') {
        this.clearColumn?.(columnId);
        dropdown.classList.remove('open');
      } else if (action === 'toggle-collapse') {
        this.toggleCollapse?.(columnId);
        dropdown.classList.remove('open');
      } else if (action === 'customize-columns') {
        this.openCustomizeColumnsModal?.();
        dropdown.classList.remove('open');
      } else if (action === 'set-wip') {
        this.openWipModal?.(columnId);
        dropdown.classList.remove('open');
      } else if (action === 'clear-wip') {
        this.setWipLimit?.(columnId, null);
        dropdown.classList.remove('open');
      }
    });

    dropdown.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); dropdown.classList.remove('open'); menuBtn.setAttribute('aria-expanded','false'); } });
  };

  let __statsScheduled = false;
  proto.updateStats = function() {
    if (__statsScheduled) return;
    __statsScheduled = true;
    requestAnimationFrame(() => {
      __statsScheduled = false;
      try {
        const boards = this.boards || {};
        let total = 0;
        let completed = 0;
        let overdueCount = 0;
        const now = Date.now();

        for (const c of this.columns) {
          const col = c.id;
          const list = boards[col] || [];
          total += list.length;
          if (col === 'done') {
            completed = list.length;
          } else {
            for (let i = 0; i < list.length; i++) {
              const cc = list[i];
              if (cc && cc.dueDate) {
                try {
                  const d = new Date(cc.dueDate);
                  const over = (typeof isOverdue === 'function') ? isOverdue(d) : (d.getTime() < now);
                  if (over) overdueCount++;
                } catch (e) {}
              }
            }
          }
        }

        const inProgress = Math.max(0, total - completed);
        const productivity = total > 0 ? Math.round((completed / total) * 100) : 0;

        const updates = [
          ['totalTasks', String(total)],
          ['completedTasks', String(completed)],
          ['inProgressTasks', String(inProgress)],
          ['productivityScore', `${productivity}%`],
          ['overdueInfo', `${overdueCount} overdue`]
        ];

        for (let i = 0; i < updates.length; i++) {
          const [id, text] = updates[i] as [string,string];
          const el = document.getElementById(id);
          if (!el) continue;
          try { if (!el.hasAttribute('aria-live')) el.setAttribute('aria-live', 'polite'); } catch {}
          if (el.textContent !== text) el.textContent = text;
        }
      } catch (err) { console.warn(err); }
    });
  };

  proto.getAllCategories = function() {
    try {
      const set = new Set();
      Object.values(this.boards).flat().forEach((c:any) => { if (c.category && String(c.category).trim()) set.add(String(c.category).trim()); });
      return Array.from(set).sort((a:any,b:any)=> a.localeCompare(b));
    } catch { return []; }
  };
  proto.populateCategorySelects = function() {
    const categories = this.getAllCategories();
    const cardSel = document.getElementById('cardCategory') as HTMLSelectElement | null;
    if (cardSel) {
      const current = cardSel.value;
      cardSel.innerHTML = '';
      cardSel.add(new Option('＋ Add new…', '__add__'));
      const optNone = new Option('— None —', ''); cardSel.add(optNone);
      categories.forEach((c:any) => cardSel.add(new Option(c, c)));
      if (current && current !== '__add__') cardSel.value = current; else cardSel.value = '';
      window.SelectEnhancer?.refresh(cardSel);
    }
    const filterSel = document.getElementById('filterCategory') as HTMLSelectElement | null;
    if (filterSel) {
      const cur = this.filters?.category || '';
      filterSel.innerHTML = '';
      filterSel.add(new Option('＋ Add new…', '__add__'));
      filterSel.add(new Option('Any category', ''));
      categories.forEach((c:any) => filterSel.add(new Option(c, c)));
      filterSel.value = (cur && cur !== '__add__') ? cur : '';
      window.SelectEnhancer?.refresh(filterSel);
    }
  };

  proto.handleCategorySelectInteractions = function() {
    const cardSel = document.getElementById('cardCategory') as HTMLSelectElement | null;
    if (cardSel && !(cardSel as any).__catWired) {
      cardSel.addEventListener('change', (e) => {
        if (cardSel.value === '__add__') {
          const name = prompt('New category name:')?.trim();
          if (name) {
            const exists = [...cardSel.options].some(o => o.value && o.value.toLowerCase() === name.toLowerCase());
            if (!exists) {
              const opt = new Option(name, name);
              const sentinelIdx = [...cardSel.options].findIndex(o => o.value === '__add__');
              const insertIdx = sentinelIdx >= 0 ? sentinelIdx + 1 : 0;
              cardSel.add(opt, insertIdx);
            }
            cardSel.value = name;
            window.SelectEnhancer?.refresh(cardSel);
          } else {
            cardSel.value = '';
            window.SelectEnhancer?.refresh(cardSel);
          }
        }
      });
      (cardSel as any).__catWired = true;
    }
    const filterSel = document.getElementById('filterCategory') as HTMLSelectElement | null;
    if (filterSel && !(filterSel as any).__catWired) {
      filterSel.addEventListener('change', (e) => {
        if (filterSel.value === '__add__') {
          const name = prompt('Add and select a category:')?.trim();
          if (name) {
            const exists = [...filterSel.options].some(o => o.value && o.value.toLowerCase() === name.toLowerCase());
            if (!exists) {
              const opt = new Option(name, name);
              const sentinelIdx = [...filterSel.options].findIndex(o => o.value === '__add__');
              const insertIdx = sentinelIdx >= 0 ? sentinelIdx + 1 : 0;
              filterSel.add(opt, insertIdx);
            }
            filterSel.value = name;
          } else {
            filterSel.value = '';
          }
          window.SelectEnhancer?.refresh(filterSel);
        }
      });
      (filterSel as any).__catWired = true;
    }
  };

  proto.openStatsModal = function() {
    try {
      const modal = document.getElementById('statsModal');
      if (!modal) return;
      const ensureChartsLib = async () => {
        if ((window as any).Chart) return;
        if (!(window as any).__chartLoading) {
          (window as any).__chartLoading = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
            s.async = true;
            s.onload = () => resolve(undefined);
            s.onerror = (e) => reject(e);
            document.head.appendChild(s);
          });
        }
        try { await (window as any).__chartLoading; } catch {}
      };
      document.body.classList.add('modal-open');
      modal.classList.add('show');
      const overlay = (e: Event) => { if (e.target === modal) { try { document.getElementById('statsModal')?.classList.remove('show'); document.body.classList.remove('modal-open'); } catch {} try { if ((modal as any).__overlayHandler) { modal.removeEventListener('click', (modal as any).__overlayHandler); (modal as any).__overlayHandler = null; } if ((modal as any).__escHandler) { document.removeEventListener('keydown', (modal as any).__escHandler, true); (modal as any).__escHandler = null; } } catch {} } };
      const esc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          try { document.getElementById('statsModal')?.classList.remove('show'); document.body.classList.remove('modal-open'); } catch {}
          try { if ((modal as any).__overlayHandler) { modal.removeEventListener('click', (modal as any).__overlayHandler); (modal as any).__overlayHandler = null; } if ((modal as any).__escHandler) { document.removeEventListener('keydown', (modal as any).__escHandler, true); (modal as any).__escHandler = null; } } catch {}
        }
      };
      if ((modal as any).__overlayHandler) modal.removeEventListener('click', (modal as any).__overlayHandler);
      (modal as any).__overlayHandler = overlay; modal.addEventListener('click', (modal as any).__overlayHandler);
      if ((modal as any).__escHandler) document.removeEventListener('keydown', (modal as any).__escHandler, true);
      (modal as any).__escHandler = esc; document.addEventListener('keydown', (modal as any).__escHandler, true);
      const renderCharts = () => {
        const countsByCol = this.columns.map((c:any) => this.boards[c.id].length);
        const priorities = { high: 0, medium: 0, low: 0 } as any;
        const due = { overdue: 0, today: 0, week: 0, none: 0 } as any;
        const today = new Date(); today.setHours(0,0,0,0);
        const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - (13 - i)); return d; });
        const countsByDay = new Array(14).fill(0);
        Object.values(this.boards).flat().forEach((card:any) => {
          if (card.priority && priorities[card.priority] !== undefined) priorities[card.priority]++;
          if (!card.dueDate) { due.none++; }
          else {
            const d = new Date(card.dueDate); d.setHours(0,0,0,0);
            if (d < today) due.overdue++; else if (d.getTime() === today.getTime()) due.today++; else if (Math.ceil((d.getTime() - today.getTime())/(1000*60*60*24)) <= 7) due.week++;
          }
          if (card.createdAt) {
            const c = new Date(card.createdAt); c.setHours(0,0,0,0);
            const idx = days.findIndex((d:any) => d.getTime() === c.getTime());
            if (idx !== -1) countsByDay[idx] += 1;
          }
        });

        const labelCols = this.columns.map((c:any) => c.title);
        const isLight = document.body.getAttribute('data-theme') === 'light';
        const accent = '#8b5cf6';
        const grid = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
        const text = isLight ? '#111827' : '#f0f0f0';

        const colorsByCol = { longterm: '#667eea', nearfuture: '#f093fb', asap: '#4facfe', done: '#43e97b' } as any;
        const getColumnAccent = (id:string) => {
          const el = document.querySelector(`.column[data-column-id="${id}"]`);
          if (el) {
            const val = getComputedStyle(el as Element).getPropertyValue('--col-accent').trim();
            if (val) return val;
          }
          return colorsByCol[id] || accent;
        };
        const colColors = this.columns.map((c:any) => getColumnAccent(c.id));

        const ensureChart = (ctxId:string, cfg:any) => {
          const ctx = (document.getElementById(ctxId) as HTMLCanvasElement | null)?.getContext('2d');
          if (!ctx || !(window as any).Chart) return;
          if (!(window as any).__zenCharts) (window as any).__zenCharts = {};
          const prev = (window as any).__zenCharts[ctxId];
          if (prev) { prev.destroy(); }
          (window as any).__zenCharts[ctxId] = new (window as any).Chart(ctx, cfg);
        };

        ensureChart('chartByColumn', {
          type: 'bar',
          data: { labels: labelCols, datasets: [{ label: 'Tasks', data: countsByCol, backgroundColor: colColors, hoverBackgroundColor: colColors, borderColor: colColors, borderWidth: 1 }] },
          options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: text }, grid: { color: grid } }, y: { ticks: { color: text }, grid: { color: grid } } }, onClick: (evt:any, elements:any) => {
            if (!elements || !elements.length) return;
            const idx = elements[0].index;
            const targetId = this.columns[idx]?.id;
            if (!targetId) return;
            document.getElementById('statsModal')?.classList.remove('show');
            document.body.classList.remove('modal-open');
            try { if ((modal as any).__overlayHandler) { modal.removeEventListener('click', (modal as any).__overlayHandler); (modal as any).__overlayHandler = null; } if ((modal as any).__escHandler) { document.removeEventListener('keydown', (modal as any).__escHandler, true); (modal as any).__escHandler = null; } } catch {}
            setTimeout(() => (window as any).scrollToColumn?.(targetId), 50);
          } }
        });
        ensureChart('chartPriority', {
          type: 'doughnut',
          data: { labels: ['High','Medium','Low'], datasets: [{ data: [priorities.high, priorities.medium, priorities.low], backgroundColor: ['#ef4444','#eab308','#22c55e'] }] },
          options: { responsive: true, plugins: { legend: { display: false }, tooltip: { enabled: true, callbacks: { labelColor: (ctx:any) => ({ borderColor: ctx.dataset.backgroundColor[ctx.dataIndex], backgroundColor: ctx.dataset.backgroundColor[ctx.dataIndex] }) } } } }
        });
        ensureChart('chartDue', {
          type: 'doughnut',
          data: { labels: ['Overdue','Today','Within 7 days','No due date'], datasets: [{ data: [due.overdue, due.today, due.week, due.none], backgroundColor: ['#ef4444','#60a5fa','#a78bfa','#6b7280'] }] },
          options: { responsive: true, plugins: { legend: { display: false }, tooltip: { enabled: true, callbacks: { labelColor: (ctx:any) => ({ borderColor: ctx.dataset.backgroundColor[ctx.dataIndex], backgroundColor: ctx.dataset.backgroundColor[ctx.dataIndex] }) } } } }
        });
        ensureChart('chartCreatedTrend', {
          type: 'line',
          data: { labels: days.map((d:any) => `${d.getMonth()+1}/${d.getDate()}`), datasets: [{ label: 'Created', data: countsByDay, borderColor: accent, backgroundColor: 'rgba(139,92,246,0.25)', fill: true }] },
          options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: text }, grid: { color: grid } }, y: { ticks: { color: text }, grid: { color: grid } } } }
        });
      };

      ensureChartsLib().then(() => {
        try { renderCharts(); } catch (e) { console.warn(e); }
      });
    } catch (e) { console.warn(e); }
  };

  proto.initFilterChips = function() {
    const chipWrap = document.getElementById('priorityChips');
    if (!chipWrap) return;
    chipWrap.addEventListener('click', (e) => {
      const chip = (e.target as HTMLElement)?.closest('.chip');
      if (!chip) return;
      const p = chip.getAttribute('data-priority');
      const active = this.filters.priorities.has(p);
      if (active) {
        if (this.filters.priorities.size > 1) this.filters.priorities.delete(p);
      } else {
        this.filters.priorities.add(p);
      }
      this.syncFilterChips();
    });
    this.syncFilterChips();
  };
  proto.syncFilterChips = function() {
    const chips = document.querySelectorAll('#priorityChips .chip');
    chips.forEach(chip => {
      const p = (chip as HTMLElement).getAttribute('data-priority');
      chip.classList.toggle('active', this.filters.priorities.has(p));
    });
  };

  proto.renderCategoryChips = function() {
    try {
      const wrap = document.getElementById('categoryChips');
      if (!wrap) return;
      const categories = this.getAllCategories();
      const html = [
        `<button class="chip" data-category="" aria-pressed="${this.filters.category ? 'false' : 'true'}">Any category</button>`,
        ...categories.map((c:any) => `<button class="chip" data-category="${escapeHTML ? escapeHTML(c) : c}" aria-pressed="${(this.filters.category||'').toLowerCase() === c.toLowerCase()}" title="${escapeHTML ? escapeHTML(c) : c}">${escapeHTML ? escapeHTML(c) : c}</button>`)
      ].join('');
      wrap.innerHTML = html;
      [...wrap.querySelectorAll('.chip')].forEach(btn => {
        const val = ((btn as HTMLElement).getAttribute('data-category') || '').toLowerCase();
        (btn as HTMLElement).classList.toggle('active', val === (this.filters.category || '').toLowerCase());
      });
    } catch {}
  };
  proto.renderDueChips = function() {
    try {
      const wrap = document.getElementById('dueChips');
      if (!wrap) return;
      const options = [
        { v: 'all', label: 'Any time' },
        { v: 'overdue', label: 'Overdue' },
        { v: 'today', label: 'Today' },
        { v: 'week', label: 'Within 7 days' },
        { v: 'none', label: 'No due date' }
      ];
      wrap.innerHTML = options.map(o => `<button class="chip" data-due="${o.v}" aria-pressed="${this.filters.due === o.v}">${o.label}</button>`).join('');
      [...wrap.querySelectorAll('.chip')].forEach(btn => {
        (btn as HTMLElement).classList.toggle('active', (btn as HTMLElement).getAttribute('data-due') === this.filters.due);
      });
    } catch {}
  };
  proto.initCategoryAndDueChips = function() {
    this.renderCategoryChips();
    this.renderDueChips();
    const catWrap = document.getElementById('categoryChips');
    const dueWrap = document.getElementById('dueChips');
    if (catWrap && !(catWrap as any).__wired) {
      catWrap.addEventListener('click', (e) => {
        const chip = (e.target as HTMLElement)?.closest('.chip');
        if (!chip) return;
        this.filters.category = (chip as HTMLElement).getAttribute('data-category') || '';
        this.renderCategoryChips();
      });
      (catWrap as any).__wired = true;
    }
    if (dueWrap && !(dueWrap as any).__wired) {
      dueWrap.addEventListener('click', (e) => {
        const chip = (e.target as HTMLElement)?.closest('.chip');
        if (!chip) return;
        this.filters.due = (chip as HTMLElement).getAttribute('data-due') || 'all';
        this.renderDueChips();
      });
      (dueWrap as any).__wired = true;
    }
  };

  proto.syncFilterModal = function() {
    this.syncFilterChips();
    this.renderCategoryChips();
    this.renderDueChips();
  };
  proto.openFilterModal = function() {
    this.syncFilterModal();
    document.body.classList.add('modal-open');
    document.getElementById('filterModal')?.classList.add('show');
  setTimeout(() => ((document.querySelector('#categoryChips .chip') as HTMLElement) || (document.querySelector('#dueChips .chip') as HTMLElement))?.focus(), 10);
  };
  proto.closeFilterModal = function() { document.getElementById('filterModal')?.classList.remove('show'); document.body.classList.remove('modal-open'); };
  proto.applyFilterModal = function() { this.setFilters({ priorities: new Set(this.filters.priorities), category: (this.filters.category||'').trim(), due: this.filters.due || 'all' }); this.closeFilterModal(); };
  proto.resetFilterModal = function() { this.setFilters({ priorities: new Set(['high','medium','low']), category: '', due: 'all' }); this.renderCategoryChips(); this.renderDueChips(); this.closeFilterModal(); };

  proto.attachEventListeners = function() {
    document.getElementById('cardForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveCard({
        title: (document.getElementById('cardTitle') as HTMLInputElement).value.trim(),
        description: (document.getElementById('cardDescription') as HTMLTextAreaElement).value.trim(),
        column: (document.getElementById('cardColumn') as HTMLSelectElement).value,
        priority: (document.getElementById('cardPriority') as HTMLSelectElement).value,
        category: (document.getElementById('cardCategory') as HTMLSelectElement).value,
        dueDate: (document.getElementById('cardDueDate') as HTMLInputElement).value
      });
      this.closeModal();
    });

    document.getElementById('deleteBtn')?.addEventListener('click', () => {
      if (!this.currentEditCard) return;
      const { id } = this.currentEditCard;
      this.closeModal();
      this.deleteCard(id);
    });

    const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
    if (searchInput) {
      const handler = (e:any) => this.searchCards(e.target.value);
      searchInput.addEventListener('input', (w?.Utils?.debounce ? (w.Utils.debounce(handler, 180)) : handler));
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.closeModal(); this.closeFilterModal(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); this.showAddCardModal(); }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); document.getElementById('searchInput')?.focus(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.undo(); }
      if (e.key === 'Escape') { this.closeWipModal?.(); }
    });

    document.getElementById('cardModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeModal(); });
    document.getElementById('filterModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeFilterModal(); });

    this.initFilterChips();
    this.initCategoryAndDueChips();
    this.syncFilterModal();
    this.populateCategorySelects();
    this.handleCategorySelectInteractions();
  };

  proto.showAddCardModal = function(columnId = 'longterm') {
    this.currentEditCard = null;
    document.getElementById('modalTitle')!.textContent = 'Create New Task';
    (document.getElementById('cardForm') as HTMLFormElement).reset();
    const sel = document.getElementById('cardColumn') as HTMLSelectElement | null;
    if (sel) sel.value = columnId;
    (document.getElementById('deleteBtn') as HTMLElement)!.style.display = 'none';
    this.showModal();
  };
})();
