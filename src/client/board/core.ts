(function(){
  'use strict';
  const global: any = window;
  const deepClone = (global.Utils && global.Utils.deepClone) || ((o:any)=>JSON.parse(JSON.stringify(o)));
  const saveLocalData = global.Storage?.saveData;
  const loadLocalData = global.Storage?.loadData;
  const savePrefs = global.Storage?.savePrefs;
  const loadPrefs = global.Storage?.loadPrefs;
  const showNotification = global.Notifications?.showNotification;

  class KanbanBoard {
    [key: string]: any;
    version = 2;
    columns: any[];
    minColumns = 2; maxColumns = 6;
    columnTemplates: any;
    boards: any;
    wipLimits: any;
    sorts: any;
    collapsed: any;
    draggedCard: any = null;
    currentEditCard: any = null;
    searchTerm = '';
    theme: any;
    filters: any;
    undoStack: any[] = [];
    maxUndo = 20;
    _saveDataScheduled: any = null;
    _pending: any = { savePrefs: false };

    constructor() {
      this.columns = [
        { id: 'longterm', title: 'Long-Term', icon: '📌', color: '#667eea' },
        { id: 'nearfuture', title: 'Soon', icon: '⏳', color: '#f093fb' },
        { id: 'asap', title: 'In Progress', icon: '⚡', color: '#ef4444' },
        { id: 'done', title: 'Done', icon: '✅', color: '#43e97b' }
      ];
      this.columnTemplates = {
        simple2: [ { id: 'longterm', title: 'To‑Do', icon: '📝', color: '#667eea' }, { id: 'done', title: 'Done', icon: '✅', color: '#43e97b' } ],
        basic3: [ { id: 'longterm', title: 'To‑Do', icon: '📝', color: '#667eea' }, { id: 'asap', title: 'In Progress', icon: '⚡', color: '#ef4444' }, { id: 'done', title: 'Done', icon: '✅', color: '#43e97b' } ],
        default4: [ { id: 'longterm', title: 'Long‑Term', icon: '📌', color: '#667eea' }, { id: 'nearfuture', title: 'Soon', icon: '⏳', color: '#f093fb' }, { id: 'asap', title: 'In Progress', icon: '⚡', color: '#ef4444' }, { id: 'done', title: 'Done', icon: '✅', color: '#43e97b' } ],
        agile5: [ { id: 'backlog', title: 'Backlog', icon: '📚', color: '#64748b' }, { id: 'nearfuture', title: 'Ready', icon: '🧭', color: '#06b6d4' }, { id: 'asap', title: 'In Progress', icon: '⚡', color: '#ef4444' }, { id: 'review', title: 'Review', icon: '🔍', color: '#f59e0b' }, { id: 'done', title: 'Done', icon: '✅', color: '#43e97b' } ],
        full6: [ { id: 'backlog', title: 'Backlog', icon: '📚', color: '#64748b' }, { id: 'nearfuture', title: 'Next', icon: '⏭️', color: '#06b6d4' }, { id: 'asap', title: 'In Progress', icon: '⚡', color: '#ef4444' }, { id: 'blocked', title: 'Blocked', icon: '🚫', color: '#8b5cf6' }, { id: 'review', title: 'Review', icon: '🔍', color: '#f59e0b' }, { id: 'done', title: 'Done', icon: '✅', color: '#43e97b' } ]
      };
      this.boards = { longterm: [], nearfuture: [], asap: [], done: [] };
      this.wipLimits = { longterm: null, nearfuture: null, asap: null, done: null };
      this.sorts = { longterm: 'manual', nearfuture: 'manual', asap: 'manual', done: 'manual' };
      this.collapsed = { longterm: false, nearfuture: false, asap: false, done: false };
      this.theme = localStorage.getItem('theme') || ((window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark');
      this.filters = { priorities: new Set(['high','medium','low']), category: '', due: 'all' };
      this.init();
    }
    init() {
      const afterLoad = () => {
        this.loadPrefs(); this.renderBoard(); this.attachEventListeners?.(); this.updateStats?.(); this.applyTheme?.(); this.updateFilterBadge?.(); this.updateBottomNavUI?.(); this.updateColumnSelectOptions?.();
        setTimeout(() => { if ((window as any).RemoteStorage?.isReady?.()) (this as any).syncWithRemote?.().catch(()=>{}); }, 0);
        try { const banner = document.getElementById('guestBanner'); if (banner) banner.style.display = ((window as any).RemoteStorage?.isLoggedIn?.()) ? 'none' : 'flex'; } catch {}
        const hdr = document.querySelector('header'); const stats = document.getElementById('statsBar'); const applyStatsVisibility = () => { const collapsed = hdr?.classList.contains('collapsed'); const stored = localStorage.getItem('ZenBoard_showStats'); const showUser = (stored === null) ? true : stored === 'true'; if (stats) stats.style.display = (showUser && !collapsed) ? 'grid' : 'none'; };
        applyStatsVisibility(); const origToggle = (window as any).toggleHeader; (window as any).toggleHeader = () => { origToggle(); setTimeout(applyStatsVisibility, 0); };
      };
      try { const maybePromise = this.loadData(); if (maybePromise && typeof maybePromise.then === 'function') { maybePromise.then(afterLoad).catch(()=>afterLoad()); } else { afterLoad(); } } catch { afterLoad(); }
    }
    async loadData() {
      try {
        const saved = loadLocalData ? await loadLocalData() : null;
        console.log('KanbanBoard.loadData: decrypted saved value:', saved);
        if (saved) {
          const hasOld = 'todo' in saved || 'progress' in saved || 'review' in saved;
          if (hasOld) {
            this.boards = { longterm: saved.todo || [], nearfuture: saved.progress || [], asap: saved.review || [], done: saved.done || [] };
          } else {
            this.boards = { longterm: [], nearfuture: [], asap: [], done: [], ...saved };
          }
          console.log('KanbanBoard.loadData: this.boards set to', this.boards);
        } else {
          console.log('KanbanBoard.loadData: no saved data, loading sample');
          this.loadSampleData();
        }
      } catch (e) {
        console.warn('Failed to load data, loading sample', e);
        this.loadSampleData();
      }
    }
    loadPrefs() {
      const saved = loadPrefs?.(); if (saved) { try { const prefs = saved; const migrateTitle = (t:string) => t === 'Near Future' ? 'Soon' : (t === 'ASAP' ? 'In Progress' : t); if (Array.isArray(prefs.columns)) prefs.columns = prefs.columns.map((c:any)=>({ ...c, title: migrateTitle(c.title) })); if (prefs.columnMeta && typeof prefs.columnMeta === 'object') { if (prefs.columnMeta.nearfuture) prefs.columnMeta.nearfuture.title = migrateTitle(prefs.columnMeta.nearfuture.title); if (prefs.columnMeta.asap) prefs.columnMeta.asap.title = migrateTitle(prefs.columnMeta.asap.title); }
          if (Array.isArray(prefs.columns) && prefs.columns.length >= this.minColumns && prefs.columns.length <= this.maxColumns) { this.applyColumns(prefs.columns, { silent: true }); }
          const migrateMap: any = { todo: 'longterm', progress: 'nearfuture', review: 'asap', done: 'done' };
          const migratedSorts: any = {}; const migratedCollapsed: any = {}; const migratedWip: any = {};
          for (const key of Object.keys(this.sorts)) migratedSorts[key] = this.sorts[key];
          for (const key of Object.keys(this.collapsed)) migratedCollapsed[key] = this.collapsed[key];
          for (const key of Object.keys(this.wipLimits)) migratedWip[key] = this.wipLimits[key];
          if (prefs.sorts) { for (const [k,v] of Object.entries(prefs.sorts)) { const nk = (migrateMap as any)[k] || k; migratedSorts[nk] = v; } }
          if (prefs.collapsed) { for (const [k,v] of Object.entries(prefs.collapsed)) { const nk = (migrateMap as any)[k] || k; migratedCollapsed[nk] = v; } }
          if (prefs.wipLimits) { for (const [k,v] of Object.entries(prefs.wipLimits)) { const nk = (migrateMap as any)[k] || k; const num = (v === null || v === undefined || v === '') ? null : Number(v); migratedWip[nk] = Number.isFinite(num) && num > 0 ? num : null; } }
          if (prefs.columnMeta && typeof prefs.columnMeta === 'object') { const meta = prefs.columnMeta; this.columns = this.columns.map(c => { const m = meta[c.id]; if (m && (m.title || m.icon || m.color)) return { ...c, title: m.title || c.title, icon: m.icon || c.icon, color: m.color || c.color }; return c; }); }
          this.sorts = migratedSorts; this.collapsed = migratedCollapsed; this.wipLimits = migratedWip; if (prefs.theme) this.theme = prefs.theme; if (prefs.filters) { const pf = prefs.filters; this.filters = { priorities: new Set(pf.priorities || ['high','medium','low']), category: pf.category || '', due: pf.due || 'all' }; }
        } catch {}
      }
    }
    async saveData() {
      if (this._saveDataScheduled) return this._saveDataScheduled;
      const doSave = async () => {
        try { if (saveLocalData) await saveLocalData(this.boards); } catch (e:any) {
          const msg = (e && e.message) || '';
          if (msg.toLowerCase().includes('passphrase')) {
            let pass = localStorage.getItem('ZenBoard_passphrase') || '';
            while (!pass) { try { pass = await (window as any).Passphrase.ask({ mode: 'set', label: 'Set a passphrase to encrypt your ZenBoard data (required)' }); } catch { pass = ''; } if (!pass) (window as any).Notifications?.showNotification('Passphrase required', 'A passphrase is required to save data.', null, 'warn'); }
            localStorage.setItem('ZenBoard_passphrase', pass);
            try { (window as any).RemoteStorage?.setPassphrase?.(pass); } catch {}
            try { if (saveLocalData) await saveLocalData(this.boards); } catch (e2) { console.warn('Local save failed after prompting', e2); }
          } else { console.warn('Local save failed', e); }
        }
        if ((window as any).RemoteStorage?.isReady?.() && (window as any).RemoteStorage.isLoggedIn()) { (window as any).RemoteStorage.saveData(this.boards).catch((err:any)=> console.warn('Remote save failed', err)); }
      };
  this._saveDataScheduled = new Promise<void>((resolve)=>{ const run = () => doSave().catch(()=>{}).then(()=>resolve()); try { requestAnimationFrame(run); } catch { setTimeout(run, 0); } }).finally(()=>{ this._saveDataScheduled = null; });
      return this._saveDataScheduled;
    }
    savePrefs() { if (this._pending.savePrefs) return; this._pending.savePrefs = true; const run = () => { this._pending.savePrefs = false; const prefs = { theme: this.theme, sorts: this.sorts, collapsed: this.collapsed, wipLimits: this.wipLimits, columns: this.columns.map((c:any)=>({ id: c.id, title: c.title, icon: c.icon, color: c.color })), columnMeta: this.columns.reduce((acc:any,c:any)=>{ acc[c.id] = { title: c.title, icon: c.icon, color: c.color }; return acc; }, {}), filters: { priorities: [...this.filters.priorities], category: this.filters.category, due: this.filters.due } }; savePrefs?.(prefs); };
      try { requestAnimationFrame(run); } catch { setTimeout(run,0); }
    }
    applyColumns(newColumns:any, opts:any={}) { try { const cols = (deepClone ? deepClone(newColumns) : JSON.parse(JSON.stringify(newColumns || []))).filter((c:any)=>c && c.id).map((c:any)=>({ id: String(c.id), title: c.title || c.id, icon: c.icon || '🧩', color: c.color || '' })); if (cols.length < this.minColumns || cols.length > this.maxColumns) return; try { const cur = this.columns.map((c:any)=>({ id: c.id, title: c.title, icon: c.icon, color: c.color })); const nxt = cols.map((c:any)=>({ id: c.id, title: c.title, icon: c.icon, color: c.color })); const same = cur.length === nxt.length && cur.every((c:any,i:number)=> c.id === nxt[i].id && c.title === nxt[i].title && c.icon === nxt[i].icon && c.color === nxt[i].color); if (same) return; } catch {}
        const hasDone = cols.some((c:any)=>c.id === 'done'); if (!hasDone) cols.push({ id: 'done', title: 'Done', icon: '✅', color: '#43e97b' }); const oldIds = new Set(this.columns.map((c:any)=>c.id)); const newIds = new Set(cols.map((c:any)=>c.id)); cols.forEach((c:any)=>{ if (!this.boards[c.id]) this.boards[c.id] = []; }); const colOrder = cols.map((c:any)=>c.id); this.columns.forEach((c:any, idx:number)=>{ if (!newIds.has(c.id)) { const cards = this.boards[c.id] || []; const targetIdx = Math.max(0, Math.min(idx - 1, colOrder.length - 1)); const targetId = colOrder[targetIdx] || colOrder[0]; if (targetId) this.boards[targetId] = (this.boards[targetId] || []).concat(cards); delete this.boards[c.id]; delete this.sorts[c.id]; delete this.collapsed[c.id]; delete this.wipLimits[c.id]; } }); cols.forEach((c:any) => { if (!(c.id in this.sorts)) this.sorts[c.id] = 'manual'; if (!(c.id in this.collapsed)) this.collapsed[c.id] = false; if (!(c.id in this.wipLimits)) this.wipLimits[c.id] = null; }); this.columns = cols; this.savePrefs?.(); this.saveData?.(); this.renderBoard?.(); this.updateBottomNavUI?.(); this.updateColumnSelectOptions?.(); this.updateStats?.(); if (!opts.silent) showNotification?.('Columns updated', 'Template applied', null, 'info'); } catch {} }
    applyTemplate(key:any) { const tpl = this.columnTemplates?.[key]; if (!tpl) return; try { const cur = this.columns.map((c:any)=>c.id).join(','); const tgt = (tpl || []).map((c:any)=>c.id).join(','); if (cur === tgt) { showNotification?.('Template already applied', 'No changes were needed', null, 'info'); return; } } catch {} this.applyColumns(tpl); }
    addColumn() { if (this.columns.length >= this.maxColumns) { showNotification?.('Limit reached', `Maximum ${this.maxColumns} columns`, null, 'warn'); return; } let i = 1; let id = `col${i}`; const used = new Set(this.columns.map((c:any)=>c.id)); while (used.has(id) || id === 'done') { i++; id = `col${i}`; if (i > 99) break; } const col = { id, title: 'New', icon: '🧩', color: '#64748b' }; if (this.columns[this.columns.length - 1]?.id === 'done') { this.columns.splice(this.columns.length - 1, 0, col); } else { this.columns.push(col); } this.boards[id] = []; this.sorts[id] = 'manual'; this.collapsed[id] = false; this.wipLimits[id] = null; this.savePrefs?.(); this.renderBoard?.(); this.updateBottomNavUI?.(); this.updateColumnSelectOptions?.(); showNotification?.('Column added', `${col.title}`, null, 'info'); }
    removeColumn(columnId:any) { if (this.columns.length <= this.minColumns) { showNotification?.('Need at least 2', 'Minimum 2 columns required', null, 'warn'); return; } if (columnId === 'done') { showNotification?.('Protected', 'Cannot remove Done column', null, 'warn'); return; } const idx = this.columns.findIndex((c:any)=>c.id === columnId); if (idx === -1) return; const targetIdx = (idx > 0) ? idx - 1 : (this.columns.length > idx + 1 ? idx + 1 : 0); const targetId = this.columns[targetIdx]?.id; if (targetId) { const cards = this.boards[columnId] || []; this.boards[targetId] = (this.boards[targetId] || []).concat(cards); } this.columns.splice(idx, 1); delete this.boards[columnId]; delete this.sorts[columnId]; delete this.collapsed[columnId]; delete this.wipLimits[columnId]; this.savePrefs?.(); this.saveData?.(); this.renderBoard?.(); this.updateBottomNavUI?.(); this.updateColumnSelectOptions?.(); this.updateStats?.(); showNotification?.('Column removed', `${columnId}`, null, 'info'); }
    loadSampleData() { const uuid = window.Utils?.uuid; const nowIso = new Date().toISOString(); const isLoggedIn = !!(window as any).RemoteStorage?.isLoggedIn?.(); const day = (n:number) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); };
      if (isLoggedIn) { this.boards = { longterm: [ { id: uuid(), title: 'Welcome to ZenBoard! 🎉', description: 'Create, drag, filter, and customize your columns.', priority: 'low', category: 'Tutorial', createdAt: nowIso } ], nearfuture: [ { id: uuid(), title: 'Explore Features', description: 'Filters, sorting, keyboard shortcuts, undo, and cloud sync.', priority: 'medium', category: 'Learning', createdAt: nowIso } ], asap: [], done: [] }; } else { this.boards = { longterm: [ { id: uuid(), title: 'Master shortcuts ⌨️', description: 'Press Ctrl+/ to focus search. Ctrl+N for a new task. Drag to reorder.', priority: 'low', category: 'Tutorial', createdAt: nowIso }, { id: uuid(), title: 'Plan quarterly goals', description: 'Define 3 focus outcomes for the next quarter.', priority: 'medium', category: 'Planning', createdAt: nowIso, dueDate: day(30) }, { id: uuid(), title: 'Big feature: Subtasks', description: 'Sketch a design for nested tasks and simple checklists.', priority: 'medium', category: 'Product', createdAt: nowIso }, { id: uuid(), title: 'Read “Deep Work”', description: 'Notes on focus and flow. 30 minutes per day.', priority: 'low', category: 'Personal', createdAt: nowIso } ], nearfuture: [ { id: uuid(), title: 'Polish header layout', description: 'Tighten spacing, soften shadows, and align actions.', priority: 'medium', category: 'Design', createdAt: nowIso }, { id: uuid(), title: 'Add color labels', description: 'Simple category chips and priority tags.', priority: 'low', category: 'UI', createdAt: nowIso }, { id: uuid(), title: 'Write tests', description: 'Cover drag/drop ordering and filter combinations.', priority: 'high', category: 'Quality', createdAt: nowIso, dueDate: day(7) }, { id: uuid(), title: 'Backup board data', description: 'Export JSON and verify import works (guest hint).', priority: 'low', category: 'Chore', createdAt: nowIso } ], asap: [ { id: uuid(), title: 'Buy bread', description: 'White. Maybe sourdough?', priority: 'low', category: 'Food', createdAt: nowIso, dueDate: day(0) }, { id: uuid(), title: 'Fix login hint', description: 'Show a friendly banner encouraging sign-in for sync.', priority: 'medium', category: 'UX', createdAt: nowIso }, { id: uuid(), title: 'Pay utilities', description: 'Electric + water', priority: 'high', category: 'Personal', createdAt: nowIso, dueDate: day(-1) } ], done: [ { id: uuid(), title: 'Install ZenBoard', description: 'Open the app and look around.', priority: 'low', category: 'Tutorial', createdAt: nowIso }, { id: uuid(), title: 'Create your first task', description: 'Click New Task or press Ctrl+N.', priority: 'low', category: 'Tutorial', createdAt: nowIso } ] }; }
      this.saveData(); }
    toggleTheme() { this.theme = this.theme === 'dark' ? 'light' : 'dark'; this.applyTheme(); localStorage.setItem('theme', this.theme); this.savePrefs(); }
    applyTheme() { document.body.setAttribute('data-theme', this.theme); const icon = document.getElementById('themeIcon'); if (icon) icon.textContent = this.theme === 'dark' ? '🌙' : '☀️'; }
    saveSnapshot() { const snap = deepClone ? deepClone(this.boards) : JSON.parse(JSON.stringify(this.boards)); this.undoStack.push(snap); if (this.undoStack.length > this.maxUndo) this.undoStack.shift(); }
    undo() { const snap = this.undoStack.pop(); if (!snap) return; this.boards = snap; this.saveData(); this.renderBoard(); this.updateStats(); }
    async syncWithRemote() { try { if (!((window as any).RemoteStorage?.isLoggedIn?.())) return; const res = await (window as any).RemoteStorage.loadData(); if (res && res.data) { this.boards = { todo: [], progress: [], review: [], done: [], ...res.data }; try { if (saveLocalData) await saveLocalData(this.boards); } catch {} this.renderBoard(); this.updateStats(); showNotification?.('Synced', 'Loaded your cloud board', null, 'info'); } else { await (window as any).RemoteStorage.saveData(this.boards); } } catch (e) { console.warn('Remote sync failed', e); } }
    isAnyFilterActive() { if (this.searchTerm) return true; if (this.filters.category.trim()) return true; if (this.filters.due !== 'all') return true; if (this.filters.priorities.size !== 3) return true; return false; }
    canReorderColumn(columnId:any) { return !this.isAnyFilterActive(); }
    setWipLimit(columnId:any, value:any) { const normalized = (value === null || value === undefined) ? null : (Number.isFinite(value) ? Math.max(1, Math.floor(value)) : null); this.wipLimits[columnId] = normalized; this.savePrefs(); this.updateAllCounts?.(); const title = this.columns.find((c:any)=>c.id === columnId)?.title || columnId; if (normalized) { showNotification?.('WIP limit set', `${title}: ${normalized} tasks max`, null, 'info'); } else { showNotification?.('WIP limit cleared', `${title} has no limit now`, null, 'info'); } }
    formatCountWithLimit(columnId:any, visibleCount:number) { const limit = this.wipLimits[columnId]; if (Number.isFinite(limit) && limit > 0) { return `${visibleCount} / ${limit}`; } return String(visibleCount); }
    warnIfOverWip(columnId:any) { const limit = this.wipLimits[columnId]; if (!Number.isFinite(limit) || limit <= 0) return; const total = this.boards[columnId].length; if (total > limit) { const title = this.columns.find((c:any)=>c.id === columnId)?.title || columnId; showNotification?.('WIP limit exceeded', `${title} has ${total}/${limit}. Tip: avoid overloading—focus on fewer tasks for better flow.`, null, 'warn'); this.updateAllCounts?.(); } }
    toggleCollapse(columnId:any) { this.collapsed[columnId] = !this.collapsed[columnId]; this.savePrefs(); try { const section = document.querySelector(`section.column[data-column-id="${columnId}"]`); if (section) { section.classList.toggle('collapsed', this.collapsed[columnId]); const container = section.querySelector('.cards-container'); if (container) { container.getBoundingClientRect(); section.classList.toggle('anim-collapsing', true); setTimeout(()=> section.classList.toggle('anim-collapsing', false), 500); } } const menuBtn = document.querySelector(`section.column[data-column-id="${columnId}"] .menu-dropdown`); if (menuBtn) { const btn = menuBtn.querySelector('[data-action="toggle-collapse"]'); if (btn) btn.textContent = this.collapsed[columnId] ? '📂 Expand' : '📁 Collapse'; } } catch (e) { this.renderBoard(); } }
    removeCardFromColumn(cardId:any, columnId?:any) { for (const col of Object.keys(this.boards)) { const idx = this.boards[col].findIndex((c:any)=>c.id === cardId); if (idx !== -1) { const [card] = this.boards[col].splice(idx,1); return card; } } return null; }
  }
  (window as any).KanbanBoard = KanbanBoard;
})();
