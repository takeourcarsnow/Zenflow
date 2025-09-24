// Converted from js/board/modals_and_crud.js
(function(){
  'use strict';
  const w:any = window as any;
  const { uuid, escapeHTML } = w.Utils || {};
  const { showNotification } = w.Notifications || {};

  const proto = w.KanbanBoard && w.KanbanBoard.prototype;
  if (!proto) return;

  proto.saveCard = function(data:any) {
    const isEditing = !!this.currentEditCard;
    this.saveSnapshot();
    console.log('saveCard called with', data, 'isEditing?', isEditing);
    if (isEditing) {
      for (const col in this.boards) {
        this.boards[col] = this.boards[col].filter((c:any) => c.id !== this.currentEditCard.id);
      }
    }
    const card = {
      id: isEditing ? this.currentEditCard.id : (uuid ? uuid() : String(Date.now())),
      title: data.title,
      description: data.description,
      priority: data.priority,
      category: data.category,
      dueDate: data.dueDate || '',
      createdAt: isEditing ? this.currentEditCard.createdAt : new Date().toISOString(),
      comments: 0
    } as any;
    try { card.__lcHay = `${(card.title||'')}\n${(card.description||'')}\n${(card.category||'')}`.toLowerCase(); card.__hayVer = 1; } catch {}
    this.boards[data.column].push(card);
  console.log('saveCard: pushed card into', data.column, 'new length', this.boards[data.column].length);
  this.saveData(); this.renderBoard();
  try { this.refreshColumn?.(data.column); this.reorderColumnDomToCurrentSort?.(data.column); } catch {}
  this.updateStats(); try { this.populateCategorySelects?.(); } catch {}
  try { console.log('DOM .card count after render:', document.querySelectorAll('.card').length); } catch (e) {}
    showNotification?.(isEditing ? 'Task updated' : 'Task created', (escapeHTML ? escapeHTML(card.title) : card.title), { actionLabel: 'Undo', onAction: () => this.undo() });
    this.warnIfOverWip(data.column);
  };

  proto.editCard = function(cardId:any, columnId?:any) {
    const col = columnId && this.boards[columnId] ? columnId : Object.keys(this.boards).find((c:any) => this.boards[c].some((x:any) => x.id === cardId));
    const card = this.boards[col]?.find((c:any)=>c.id===cardId);
    if (!card) return;
    this.currentEditCard = { ...card };
    (document.getElementById('modalTitle') as HTMLElement).textContent = 'Edit Task';
    (document.getElementById('cardTitle') as HTMLInputElement).value = card.title || '';
    (document.getElementById('cardDescription') as HTMLTextAreaElement).value = card.description || '';
    (document.getElementById('cardColumn') as HTMLSelectElement).value = col;
    (document.getElementById('cardPriority') as HTMLSelectElement).value = card.priority || 'low';
    try { this.populateCategorySelects?.(); this.handleCategorySelectInteractions?.(); } catch {}
    const catSel = document.getElementById('cardCategory') as HTMLSelectElement | null;
    if (catSel) {
      const val = card.category || '';
      if (val && ![...catSel.options].some((o:any)=>o.value===val)) catSel.add(new Option(val, val), catSel.options.length - 0);
      catSel.value = val;
      window.SelectEnhancer?.refresh(catSel);
    }
    (document.getElementById('cardDueDate') as HTMLInputElement).value = card.dueDate || '';
    (document.getElementById('deleteBtn') as HTMLElement).style.display = 'inline-flex';
    this.showModal();
  };

  proto.deleteCard = function(cardId:any, columnId?:any) {
    this.saveSnapshot();
    const col = columnId || Object.keys(this.boards).find((c:any) => this.boards[c].some((x:any)=>x.id===cardId));
    if (!col) return;
    this.boards[col] = this.boards[col].filter((c:any) => c.id !== cardId);
    this.saveData(); this.renderBoard(); this.updateStats();
    showNotification?.('Task deleted', 'The task has been removed', { actionLabel: 'Undo', onAction: () => this.undo() });
  };

  proto.clearColumn = function(columnId:any) {
    const title = this.columns.find((c:any)=>c.id===columnId)?.title || columnId;
    showNotification?.('Confirm', `Clear all tasks in ${title}?`, { actionLabel: 'Yes, clear', onAction: () => {
      this.saveSnapshot(); this.boards[columnId] = []; this.saveData(); this.renderBoard(); this.updateStats(); showNotification?.('Column cleared', `All tasks removed from ${title}`, { actionLabel: 'Undo', onAction: () => this.undo() });
    } }, 'warn');
  };

  proto.showModal = function() { try { this.populateCategorySelects?.(); this.handleCategorySelectInteractions?.(); } catch {} document.body.classList.add('modal-open'); document.getElementById('cardModal')!.classList.add('show'); setTimeout(()=>document.getElementById('cardTitle')?.focus(),10); };
  proto.closeModal = function() { document.getElementById('cardModal')?.classList.remove('show'); document.body.classList.remove('modal-open'); this.currentEditCard = null; (document.getElementById('cardForm') as HTMLFormElement | null)?.reset(); (document.getElementById('deleteBtn') as HTMLElement | null)!.style.display = 'none'; };

  proto.openWipModal = function(columnId:any) {
    try {
      this._wipTarget = columnId;
      const modal = document.getElementById('wipModal'); if (!modal) return;
      const title = this.columns.find((c:any)=>c.id===columnId)?.title || columnId;
      const nameSpan = document.getElementById('wipColumnName'); if (nameSpan) nameSpan.textContent = title;
      const input = document.getElementById('wipInput') as HTMLInputElement | null; if (input) input.value = this.wipLimits[columnId] ?? '';
      if (!this._wipWired) {
        const form = document.getElementById('wipForm'); const clearBtn = document.getElementById('wipClearBtn');
        form?.addEventListener('submit', (e:any) => { e.preventDefault(); const raw = (document.getElementById('wipInput') as HTMLInputElement).value.trim(); const num = Number(raw); if (!raw || !Number.isFinite(num) || num <= 0) this.setWipLimit(this._wipTarget, null); else this.setWipLimit(this._wipTarget, Math.floor(num)); this.closeWipModal(); });
        clearBtn?.addEventListener('click', () => { this.setWipLimit(this._wipTarget, null); this.closeWipModal(); });
        document.getElementById('wipModal')?.addEventListener('click', (e:any) => { if (e.target === e.currentTarget) this.closeWipModal(); });
        this._wipWired = true;
      }
      document.body.classList.add('modal-open'); modal.classList.add('show'); setTimeout(()=>document.getElementById('wipInput')?.focus(),10);
    } catch {}
  };
  proto.closeWipModal = function() { document.getElementById('wipModal')?.classList.remove('show'); document.body.classList.remove('modal-open'); };

  proto.openCustomizeColumnsModal = function() {
    const modal = document.getElementById('customizeColumnsModal');
    let body = document.getElementById('ccBody');
    if (!modal) return;
    // If the server-rendered page left the modal as an empty placeholder (Next.js path),
    // populate the modal with the expected inner markup so the rest of the code can
    // find `#ccBody`, `#customizeColumnsForm`, etc.
    if (!body) {
      modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title" id="ccTitle">Customize Columns</h2>
          <button class="close-btn" onclick="app.closeCustomizeColumnsModal()" aria-label="Close">&times;</button>
        </div>
        <form id="customizeColumnsForm" class="form-grid">
          <div id="ccBody" class="form-grid"></div>
          <div class="form-actions">
            <div class="left-actions">
              <button type="button" class="btn btn-ghost" onclick="app.resetDefaultColumnMeta()">Reset to defaults</button>
            </div>
            <div class="right-actions">
              <button type="button" class="btn btn-ghost" onclick="app.closeCustomizeColumnsModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </div>
        </form>
      </div>`;
      body = document.getElementById('ccBody');
    }
    // Header controls: template selector + add/remove controls
    const tplOptions = [
      { value: 'simple2', label: 'Simple (To‑Do / Done)' },
      { value: 'basic3', label: 'Basic (To‑Do / In Progress / Done)' },
      { value: 'default4', label: 'Balanced (Long‑Term / Soon / In Progress / Done)' },
      { value: 'agile5', label: 'Agile (Backlog / Ready / In Progress / Review / Done)' },
      { value: 'full6', label: 'Full (Backlog / Next / In Progress / Blocked / Review / Done)' }
    ];
    const emojiPresets = [
      '📌','📍','⭐','✨','⚡','🔥','🚀','✅','☑️','📝','📚','💡','🧠','🧰','🔧','🛠️','🐞','🧪','💻','📅','⏳','⏰','🏷️','🎯','💬','📈','🔒','🎨','🧹','🍀'
    ];
    const headerControls = `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="ccTemplateSelect">Template</label>
          <select id="ccTemplateSelect" class="form-select">
            ${tplOptions.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
          </select>
          <div class="form-hint">Switch stages quickly; tasks in removed columns move left.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Columns</label>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <button type="button" class="btn" id="ccAddColBtn">Add column</button>
            <button type="button" class="btn btn-ghost" id="ccRemoveLastBtn">Remove last</button>
            <span id="ccCountInfo" class="form-hint" style="margin-left:auto;">${this.columns.length} / ${this.maxColumns}</span>
          </div>
        </div>
      </div>`;

    body.innerHTML = headerControls + this.columns.map((c:any) => `
      <div class="form-row" data-col="${c.id}">
        <div class="form-group">
          <label class="form-label" for="cc-title-${c.id}">Name (${c.id})</label>
          <input class="form-input" id="cc-title-${c.id}" type="text" value="${(escapeHTML ? escapeHTML(c.title) : c.title)}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="cc-icon-${c.id}">Emoji/Icon</label>
          <div class="emoji-picker">
            <div class="emoji-input-row">
              <input class="form-input" id="cc-icon-${c.id}" type="text" value="${(escapeHTML ? escapeHTML(c.icon) : c.icon)}" maxlength="8" />
              <button type="button" class="emoji-trigger" aria-haspopup="listbox" aria-expanded="false" title="Choose emoji">😊</button>
            </div>
            <div class="emoji-popover" role="listbox" aria-label="Choose a preset emoji for this column">
              <div class="emoji-presets">
                ${emojiPresets.map(e => `<button type="button" class="emoji-preset" data-emoji="${e}" aria-label="Use ${e}" aria-pressed="false">${e}</button>`).join('')}
              </div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="cc-color-${c.id}">Color</label>
          <input class="form-input" id="cc-color-${c.id}" type="color" value="${c.color || '#667eea'}" />
          <div class="form-hint">Used for the column accent and highlight.</div>
        </div>
      </div>
    `).join('');
    document.body.classList.add('modal-open');
    modal.classList.add('show');
    // Overlay and Esc to close
    const overlay = (e:any) => { if (e.target === modal) this.closeCustomizeColumnsModal(); };
    const esc = (e:any) => { if (e.key === 'Escape') { e.preventDefault(); this.closeCustomizeColumnsModal(); } };
    if ((modal as any).__overlayHandler) modal.removeEventListener('click', (modal as any).__overlayHandler);
    (modal as any).__overlayHandler = overlay; modal.addEventListener('click', (modal as any).__overlayHandler);
    if ((modal as any).__escHandler) document.removeEventListener('keydown', (modal as any).__escHandler, true);
    (modal as any).__escHandler = esc; document.addEventListener('keydown', (modal as any).__escHandler, true);

    // Wire template selector and add/remove buttons
    const selTpl = document.getElementById('ccTemplateSelect') as HTMLSelectElement | null;
    try {
      if (selTpl) {
        const cur = this.columns.map((c:any) => c.id).join(',');
        const match = Object.entries(this.columnTemplates || {}).find(([k, cols]: any) => ((cols || []).map((c:any) => c.id).join(',')) === cur);
        selTpl.value = match ? (match as any)[0] : (this.columns.length === 4 ? 'default4' : selTpl.value);
      }
    } catch {}
    selTpl?.addEventListener('change', () => {
      const key = selTpl.value;
      this.applyTemplate?.(key);
      // Re-open to refresh UI
      setTimeout(() => this.openCustomizeColumnsModal(), 0);
    });
    const addBtn = document.getElementById('ccAddColBtn');
    const rmBtn = document.getElementById('ccRemoveLastBtn');
    const countInfo = document.getElementById('ccCountInfo');
    const syncBtns = () => {
      if (countInfo) countInfo.textContent = `${this.columns.length} / ${this.maxColumns}`;
      if (addBtn) {
        if (this.columns.length >= this.maxColumns) addBtn.setAttribute('disabled', 'true'); else addBtn.removeAttribute('disabled');
      }
      if (rmBtn) {
        if (this.columns.length <= this.minColumns) rmBtn.setAttribute('disabled','true'); else rmBtn.removeAttribute('disabled');
      }
    };
    addBtn?.addEventListener('click', () => { this.addColumn?.(); syncBtns(); setTimeout(() => this.openCustomizeColumnsModal(), 0); });
    rmBtn?.addEventListener('click', () => {
      const list = this.columns.slice();
      let idx = list.length - 1;
      if (list[idx]?.id === 'done') idx--;
      if (idx >= 0) this.removeColumn?.(list[idx].id);
      syncBtns(); setTimeout(() => this.openCustomizeColumnsModal(), 0);
    });
    syncBtns();

    // Wire emoji preset buttons and sync selected states
    const syncRowSelection = (row: Element) => {
      const input = row.querySelector('input[id^="cc-icon-"]') as HTMLInputElement | null;
      const val = input?.value?.trim();
      row.querySelectorAll('.emoji-preset').forEach(btn => {
        const isSel = (btn as HTMLElement).getAttribute('data-emoji') === val;
        (btn as HTMLElement).classList.toggle('is-selected', !!isSel);
        btn.setAttribute('aria-pressed', String(!!isSel));
      });
    };
    body.querySelectorAll('.form-row').forEach(syncRowSelection);
    body.querySelectorAll('input[id^="cc-icon-"]').forEach(inp => {
      inp.addEventListener('input', () => {
        const row = inp.closest('.form-row'); if (row) syncRowSelection(row);
      });
    });
    body.querySelectorAll('.emoji-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = (btn as Element).closest('.form-row');
        const picker = (btn as Element).closest('.emoji-picker');
        const input = row?.querySelector('input[id^="cc-icon-"]') as HTMLInputElement | null;
        if (input) {
          input.value = (btn as HTMLElement).getAttribute('data-emoji') || '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
        }
        if (picker) { picker.classList.remove('open'); picker.querySelector('.emoji-trigger')?.setAttribute('aria-expanded','false'); }
      });
    });

    const closeAllPickers = (exceptNode?: Element | null) => {
      body.querySelectorAll('.emoji-picker.open').forEach(p => { if (p !== exceptNode) { p.classList.remove('open'); p.querySelector('.emoji-trigger')?.setAttribute('aria-expanded','false'); } });
    };
    body.querySelectorAll('.emoji-trigger').forEach(btn => {
      btn.addEventListener('click', (e:any) => {
        const picker = (e.currentTarget as Element).closest('.emoji-picker'); if (!picker) return;
        const willOpen = !picker.classList.contains('open');
        closeAllPickers(picker);
        picker.classList.toggle('open', willOpen);
        (btn as HTMLElement).setAttribute('aria-expanded', String(!!willOpen));
        if (willOpen) {
          const onEsc = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape') {
              ev.stopPropagation(); picker.classList.remove('open'); (btn as HTMLElement).setAttribute('aria-expanded','false'); document.removeEventListener('keydown', onEsc, true);
            }
          };
          document.addEventListener('keydown', onEsc, true);
        }
      });
    });

    // Outside click to close
    try { this._boundEmojiOutside?.(); } catch {}
    this._boundEmojiOutside = () => {};
    const outsideHandler = (e:any) => {
      if (!modal.classList.contains('show')) return;
      const insideAny = e.target && e.target.closest && e.target.closest('.emoji-picker');
      if (!insideAny) closeAllPickers(null);
    };
    document.addEventListener('click', outsideHandler);
    this._boundEmojiOutside = () => document.removeEventListener('click', outsideHandler);

    const form = document.getElementById('customizeColumnsForm') as HTMLFormElement | null;
    if (form) {
      form.onsubmit = (e:any) => {
        e.preventDefault();
        const updates: any = {};
        this.columns.forEach((c:any) => {
          const t = (document.getElementById(`cc-title-${c.id}`) as HTMLInputElement | null)?.value.trim();
          const i = (document.getElementById(`cc-icon-${c.id}`) as HTMLInputElement | null)?.value.trim();
          const col = (document.getElementById(`cc-color-${c.id}`) as HTMLInputElement | null)?.value.trim();
          if (t && t !== c.title) updates[c.id] = { ...(updates[c.id]||{}), title: t };
          if (i && i !== c.icon) updates[c.id] = { ...(updates[c.id]||{}), icon: i };
          if (col && col !== c.color) updates[c.id] = { ...(updates[c.id]||{}), color: col };
        });
        Object.entries(updates).forEach(([id, m]) => {
          if ((m as any).title) this.setColumnTitle(id, (m as any).title);
          if ((m as any).icon) this.setColumnIcon(id, (m as any).icon);
          if ((m as any).color) this.setColumnColor(id, (m as any).color);
        });
        this.closeCustomizeColumnsModal();
      };
    }
  };
  proto.closeCustomizeColumnsModal = function() { document.getElementById('customizeColumnsModal')?.classList.remove('show'); document.body.classList.remove('modal-open'); try { this._boundEmojiOutside?.(); this._boundEmojiOutside = null; } catch {} try { const modal = document.getElementById('customizeColumnsModal') as any; if (modal?.__overlayHandler) { modal.removeEventListener('click', modal.__overlayHandler); modal.__overlayHandler = null; } if (modal?.__escHandler) { document.removeEventListener('keydown', modal.__escHandler, true); modal.__escHandler = null; } } catch {} };

  proto.resetDefaultColumnMeta = function() { const defaults = { longterm: { title: 'Long-Term', icon: '📌', color: '#667eea' }, nearfuture: { title: 'Soon', icon: '⏳', color: '#f093fb' }, asap: { title: 'In Progress', icon: '⚡', color: '#ef4444' }, done: { title: 'Done', icon: '✅', color: '#43e97b' } }; this.columns = this.columns.map((c:any) => ({ ...c, ...(defaults[c.id] || {}) })); this.savePrefs?.(); this.renderBoard(); this.updateBottomNavUI?.(); this.updateColumnSelectOptions?.(); showNotification?.('Columns reset', 'Reverted to default names and icons', null, 'info'); };
  proto.setColumnTitle = function(columnId:any, newTitle:any) { const col = this.columns.find((c:any) => c.id === columnId); if (!col) return; col.title = newTitle; this.savePrefs?.(); this.renderBoard(); this.updateBottomNavUI?.(); this.updateColumnSelectOptions?.(); showNotification?.('Column renamed', `Now: ${col.title}`, null, 'info'); };
  proto.setColumnIcon = function(columnId:any, newIcon:any) { const col = this.columns.find((c:any) => c.id === columnId); if (!col) return; col.icon = newIcon; this.savePrefs?.(); this.renderBoard(); this.updateBottomNavUI?.(); this.updateColumnSelectOptions?.(); showNotification?.('Icon updated', `${col.icon} ${col.title}`, null, 'info'); };
  proto.setColumnColor = function(columnId:any, newColor:any) { const col = this.columns.find((c:any) => c.id === columnId); if (!col) return; col.color = newColor; this.savePrefs?.(); try { const section = document.querySelector(`section.column[data-column-id="${columnId}"]`); if (section) { (section as HTMLElement).style.setProperty('--col-accent', newColor); (section as HTMLElement).style.setProperty('--col-ring', 'color-mix(in oklab, var(--col-accent) 35%, transparent)'); } } catch {} this.renderBoard(); this.updateBottomNavUI?.(); showNotification?.('Color updated', `${col.title} color set`, null, 'info'); };
})();
