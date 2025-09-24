// Converted from js/app.js
(function(){
  'use strict';
  const w: any = window as any;

  // Passphrase modal controller
  (function setupPassphraseModal(){
    const refs:any = {};
    function cache() {
      refs.modal = document.getElementById('passphraseModal');
      refs.form = document.getElementById('ppForm');
      refs.input = document.getElementById('ppInput');
      refs.toggle = document.getElementById('ppToggle');
      refs.error = document.getElementById('ppError');
      refs.label = document.getElementById('ppLabel');
      refs.submit = document.getElementById('ppSubmitBtn');
      refs.cancel = document.getElementById('ppCancelBtn');
      refs.close = document.getElementById('ppCloseBtn');
      refs.learn = document.getElementById('ppLearnMoreBtn');
    }
    function show(opts?:any) {
      cache();
      if (!refs.modal) return Promise.reject(new Error('Passphrase modal missing'));
      const mode = opts?.mode || 'unlock';
      const title = document.getElementById('ppTitle');
      const ph = mode === 'set' ? 'Create a passphrase' : 'Enter passphrase';
      if (title) title.textContent = mode === 'set' ? 'Set Encryption Passphrase' : 'Encryption Passphrase';
      if (refs.label) refs.label.textContent = opts?.label || (mode === 'set' ? 'Create a passphrase to encrypt your board' : 'Enter your passphrase to unlock your board');
      if (refs.input) { refs.input.type = 'password'; refs.input.value = ''; refs.input.placeholder = ph; refs.input.setAttribute('autocomplete', mode === 'set' ? 'new-password' : 'current-password'); }
      if (refs.error) { refs.error.style.display = 'none'; refs.error.textContent = ''; }
      const toggle = refs.toggle;
      if (toggle) {
        toggle.onclick = () => {
          const isPw = refs.input.type === 'password';
          refs.input.type = isPw ? 'text' : 'password';
          toggle.setAttribute('aria-label', isPw ? 'Hide passphrase' : 'Show passphrase');
          toggle.textContent = isPw ? '🙈' : '👁️';
          refs.input.focus();
        };
      }

      return new Promise((resolve, reject) => {
        let settled = false;
        const close = () => {
          refs.modal.classList.remove('show'); document.body.classList.remove('modal-open');
          if (refs._overlayHandler) { refs.modal.removeEventListener('click', refs._overlayHandler); refs._overlayHandler = null; }
          if (refs._escHandler) { document.removeEventListener('keydown', refs._escHandler, true); refs._escHandler = null; }
        };
        const onCancel = () => { if (!settled) { settled = true; close(); reject(new Error('cancelled')); } };
        const onSubmit = async (e:any) => {
          e.preventDefault();
          const v = refs.input.value.trim();
          if (!v) { if (refs.error) { refs.error.textContent = 'Passphrase required'; refs.error.style.display = 'block'; } return; }
          if (!settled) { settled = true; close(); resolve(v); }
        };

        refs.cancel && (refs.cancel.onclick = onCancel);
        refs.close && (refs.close.onclick = onCancel);
        if (refs.modal) {
          const overlayHandler = (e:any) => { if (e.target === refs.modal) onCancel(); };
          refs._overlayHandler && refs.modal.removeEventListener('click', refs._overlayHandler);
          refs._overlayHandler = overlayHandler;
          refs.modal.addEventListener('click', refs._overlayHandler);
        }
        refs.form && (refs.form.onsubmit = onSubmit);
        if (refs.learn) {
          refs.learn.onclick = (e:any) => { e.preventDefault(); const url = './SECURITY.md'; try { window.open(url, '_blank', 'noopener,noreferrer'); } catch { location.href = url; } };
        }
        const esc = (e:any) => { if (e.key === 'Escape') { e.preventDefault(); onCancel(); } };
        refs._escHandler && document.removeEventListener('keydown', refs._escHandler, true);
        refs._escHandler = esc; document.addEventListener('keydown', refs._escHandler, true);

        document.body.classList.add('modal-open');
        refs.modal.classList.add('show');
        setTimeout(() => refs.input?.focus(), 30);
      });
    }
    (w as any).Passphrase = { ask: show };
  })();

  // Initialize (global) after ensuring passphrase is present (for encrypted local storage)
  (async function initApp(){
    console.log('app:initApp started');
    try {
      const hasLocal = !!localStorage.getItem('ZenBoardData');
      let pass = localStorage.getItem('ZenBoard_passphrase') || '';
      console.log('app:initApp local data present?', hasLocal, 'stored pass?', !!pass);
      if (hasLocal && !pass) {
        try { pass = await (w as any).Passphrase.ask({ mode: 'unlock' }); } catch {}
        while (!pass) {
          try { pass = await (w as any).Passphrase.ask({ mode: 'unlock' }); } catch { }
        }
        localStorage.setItem('ZenBoard_passphrase', pass);
      }
    } catch {}
    console.log('app:initApp constructing KanbanBoard');
    (w as any).app = new (w as any).KanbanBoard();
  })();

  try {
    if ('ontouchstart' in window || (navigator && (navigator as any).maxTouchPoints > 0)) {
      document.body.classList.add('is-touch');
    }
  } catch {}

  try {
    const key = 'ZenBoard_perfLite';
    let pref = localStorage.getItem(key);
    if (pref === null) { pref = 'on'; localStorage.setItem(key, pref); }
    if (pref === 'on') { document.documentElement.classList.add('perf-lite'); document.body.classList.add('perf-lite'); }
  } catch {}

  // Header collapse/expand
  (function(){
    const KEY = 'ZenBoard_header_collapsed_v1';
    function applyHeaderState(collapsed:boolean) {
      const hdr = document.querySelector('header');
      const btn = document.getElementById('headerToggleBtn');
      if (!hdr || !btn) return;
      hdr.classList.toggle('collapsed', collapsed);
      document.body.classList.toggle('header-collapsed', collapsed);
      const stats = document.getElementById('statsBar');
      if (stats) stats.style.display = collapsed ? 'none' : '';
      const labelEl = btn.querySelector('.label');
      if (labelEl) labelEl.textContent = collapsed ? 'Show' : 'Hide'; else btn.textContent = collapsed ? 'Show' : 'Hide';
      btn.setAttribute('aria-label', collapsed ? 'Show header' : 'Hide header');
    }
    (w as any).toggleHeader = () => { const current = localStorage.getItem(KEY) === '1'; const next = !current; localStorage.setItem(KEY, next ? '1' : '0'); applyHeaderState(next); };
    window.addEventListener('DOMContentLoaded', () => {
      const collapsed = localStorage.getItem(KEY) === '1';
      applyHeaderState(collapsed);
    });
  })();

  // Global bridges for inline onclicks
  (w as any).showAddCardModal = (columnId:any) => (w as any).app.showAddCardModal(columnId);
  (w as any).closeModal = () => (w as any).app.closeModal();
  (w as any).toggleTheme = () => (w as any).app.toggleTheme();
  (w as any).showFilterModal = () => (w as any).app.openFilterModal();
  (w as any).closeFilterModal = () => (w as any).app.closeFilterModal();
  (w as any).applyFilters = () => (w as any).app.applyFilterModal();
  (w as any).resetFilters = () => (w as any).app.resetFilterModal();
  (w as any).openStatsModal = () => {
    try {
      const modal = document.getElementById('statsModal');
      if (!modal) return;
      // If server-side placeholder is empty (Next.js path), populate full stats markup
      if (!modal.querySelector('.modal-content') || modal.innerHTML.trim() === '') {
        modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title" id="statsTitle">Board Statistics</h2>
          <button class="close-btn" onclick="closeStatsModal()" aria-label="Close">&times;</button>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Tasks by Column</label>
            <canvas id="chartByColumn" height="140"></canvas>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Priorities</label>
              <canvas id="chartPriority" height="160"></canvas>
            </div>
            <div class="form-group">
              <label class="form-label">Due Status</label>
              <canvas id="chartDue" height="160"></canvas>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Tasks Created (Last 14 Days)</label>
            <canvas id="chartCreatedTrend" height="140"></canvas>
          </div>
        </div>
      </div>
      `;
      }
    } catch (err) { console.error('[src/app.ts] failed to populate statsModal', err); }
    try { (w as any).app.openStatsModal?.(); } catch (err) { console.error('[src/app.ts] app.openStatsModal threw', err); }
  };
  (w as any).closeStatsModal = () => { const modal = document.getElementById('statsModal'); modal?.classList.remove('show'); document.body.classList.remove('modal-open'); if ((modal as any)?.__overlayHandler) { modal.removeEventListener('click', (modal as any).__overlayHandler); (modal as any).__overlayHandler = null; } if ((modal as any)?.__escHandler) { document.removeEventListener('keydown', (modal as any).__escHandler, true); (modal as any).__escHandler = null; } };
  (w as any).openHelpModal = (sectionId?:string) => {
    document.body.classList.add('modal-open');
    const modal = document.getElementById('helpModal');
    if (!modal) return;
    // If server-side placeholder is empty (Next.js path), populate help modal markup
    try {
      if (!modal.querySelector('.modal-content') || modal.innerHTML.trim() === '') {
        modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title" id="helpTitle">Welcome to ZenBoard</h2>
          <button class="close-btn" onclick="closeHelpModal()" aria-label="Close">&times;</button>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <p><strong>ZenBoard</strong> is a simple, fast Kanban board to help you plan work and life. It’s great for students, freelancers, small teams, and households&mdash;no setup, works offline, and stays private by default.</p>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">What is Kanban?</label>
              <ul>
                <li><strong>Visual workflow</strong>: tasks live on cards and move through columns.</li>
                <li><strong>Stages</strong>: customize columns (e.g., Long‑Term → Soon → In Progress → Done).</li>
                <li><strong>Focus</strong>: limit what’s in progress to avoid overload.</li>
              </ul>
            </div>
            <div class="form-group">
              <label class="form-label">Who is it for?</label>
              <ul>
                <li>Students planning assignments and exams.</li>
                <li>Freelancers tracking client work and invoices.</li>
                <li>Small teams organizing sprints or features.</li>
                <li>Personal life: errands, chores, side projects.</li>
              </ul>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Why ZenBoard?</label>
            <ul>
              <li><strong>Offline‑first & private</strong>: your board is stored in your browser. Optional cloud sync if you want it.</li>
              <li><strong>Fast & minimal</strong>: no accounts needed to start; just add tasks and go.</li>
              <li><strong>Flexible</strong>: rename columns, set WIP limits, filter by priority, due, or category.</li>
            </ul>
          </div>

          <div class="form-group">
            <label class="form-label">Quick Start</label>
            <ol>
              <li>Click <strong>New Task</strong> (or press <strong>Ctrl+N</strong>) and add a title.</li>
              <li>Drag cards between columns as they progress.</li>
              <li>Use <strong>Filters</strong> to focus by priority, category, or due date.</li>
              <li>Customize columns (name/icon) from any column’s menu.</li>
              <li>Optionally set a <strong>WIP limit</strong> to prevent overload.</li>
            </ol>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tips</label>
              <ul>
                <li>Keep card titles short; details go in the description.</li>
                <li>Tag with a category to group related work (e.g., School, Home, Client A).</li>
                <li>Mark due dates to highlight what’s urgent today/this week.</li>
              </ul>
            </div>
            <div class="form-group">
              <label class="form-label">Keyboard</label>
              <ul>
                <li><strong>Ctrl+N</strong>: New task</li>
                <li><strong>Ctrl+/</strong>: Focus search</li>
                <li><strong>Esc</strong>: Close dialogs</li>
              </ul>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" id="helpPrivacy">Privacy & Encryption</label>
            <p>Your board is encrypted with your passphrase before it’s saved locally or synced. We never store or transmit your passphrase. If you forget it, your encrypted data cannot be recovered.</p>
            <ul>
              <li><strong>How it works:</strong> ZenBoard derives a key from your passphrase (PBKDF2-SHA256) and encrypts your board using AES‑GCM. The result is stored locally and, if you sign in, in your cloud record.</li>
              <li><strong>Your responsibility:</strong> Keep your passphrase safe. Losing it means losing access to your encrypted data.</li>
              <li><strong>Device setup:</strong> You’ll be asked for the same passphrase on each device to unlock your board.</li>
            </ul>
          </div>
        </div>
      </div>
      `;
      }
    } catch (err) { console.error('[src/app.ts] failed to populate helpModal', err); }
    modal.classList.add('show');
    const overlay = (e:any) => { if (e.target === modal) (w as any).closeHelpModal(); };
    const esc = (e:any) => { if (e.key === 'Escape') { e.preventDefault(); (w as any).closeHelpModal(); } };
    if ((modal as any).__overlayHandler) modal.removeEventListener('click', (modal as any).__overlayHandler);
    (modal as any).__overlayHandler = overlay; modal.addEventListener('click', (modal as any).__overlayHandler);
    if ((modal as any).__escHandler) document.removeEventListener('keydown', (modal as any).__escHandler, true);
    (modal as any).__escHandler = esc; document.addEventListener('keydown', (modal as any).__escHandler, true);
    if (sectionId) {
      setTimeout(() => {
        const target = document.getElementById(sectionId);
        if (target) {
          try { (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
          const prevTab = target.getAttribute('tabindex');
          target.setAttribute('tabindex', '-1');
          (target as HTMLElement).focus({ preventScroll: true });
          setTimeout(() => { if (prevTab === null) target.removeAttribute('tabindex'); }, 500);
        }
      }, 50);
    }
  };
  (w as any).closeHelpModal = () => { const modal = document.getElementById('helpModal'); modal?.classList.remove('show'); document.body.classList.remove('modal-open'); if ((modal as any)?.__overlayHandler) { modal.removeEventListener('click', (modal as any).__overlayHandler); (modal as any).__overlayHandler = null; } if ((modal as any)?.__escHandler) { document.removeEventListener('keydown', (modal as any).__escHandler, true); (modal as any).__escHandler = null; } };

  (w as any).openCustomizeColumnsModal = () => (w as any).app.openCustomizeColumnsModal();
  (w as any).closeCustomizeColumnsModal = () => (w as any).app.closeCustomizeColumnsModal();
  (w as any).openWipModal = (columnId:any) => (w as any).app.openWipModal(columnId);
  (w as any).closeWipModal = () => (w as any).app.closeWipModal();

  (w as any).openSettingsModal = () => {
    try {
      const modal = document.getElementById('settingsModal');
      console.debug('[src/app.ts] openSettingsModal invoked; modalExists=', !!modal, 'appExists=', !!(w as any).app);
      if (!modal || !(w as any).app) return;

      // If the settings modal hasn't been populated (Next.js injects an empty placeholder)
      // populate a minimal but fully-featured settings form so the wiring below can find
      // the expected elements by id. This mirrors the original static `index.html` markup
      // but keeps the template small and focused on ids used by the code.
      try {
        if (!modal.querySelector('.modal-content') || modal.innerHTML.trim() === '') {
          modal.innerHTML = `
            <div class="modal-content">
              <div class="modal-header">
                <h2 class="modal-title" id="settingsTitle">Settings</h2>
                <button class="close-btn" onclick="closeSettingsModal()" aria-label="Close">&times;</button>
              </div>
              <form id="settingsForm" class="form-grid">
                <div class="form-group">
                  <div class="form-label">Theme</div>
                  <div class="segmented" role="tablist" aria-label="Theme">
                    <button type="button" id="themeLightBtn" class="seg-btn">Light</button>
                    <button type="button" id="themeDarkBtn" class="seg-btn">Dark</button>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="showStatsToggle">Stats Bar</label>
                  <input type="checkbox" id="showStatsToggle"> Show stats bar on header
                </div>
                <div class="form-group">
                  <button type="button" class="btn" id="openCustomizeColumnsBtn">Customize columns…</button>
                  <button type="button" class="btn btn-ghost" id="clearAllWipBtn">Clear all WIP limits</button>
                </div>
                <div class="form-group">
                  <button type="button" class="btn" id="settingsSignInBtn">Sign In</button>
                  <button type="button" class="btn" id="settingsSignOutBtn" style="display:none">Sign Out</button>
                </div>
                <div class="form-actions">
                  <div class="right-actions">
                    <button type="button" class="btn btn-ghost" onclick="closeSettingsModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                  </div>
                </div>
              </form>
            </div>
          `;
        }
      } catch (err) { console.error('[src/app.ts] failed to populate settingsModal', err); }
      document.body.classList.add('modal-open');
      modal.classList.add('show');
      const overlay = (e:any) => { if (e.target === modal) (w as any).closeSettingsModal(); };
      const esc = (e:any) => { if (e.key === 'Escape') { e.preventDefault(); (w as any).closeSettingsModal(); } };
      if ((modal as any).__overlayHandler) modal.removeEventListener('click', (modal as any).__overlayHandler);
      (modal as any).__overlayHandler = overlay; modal.addEventListener('click', (modal as any).__overlayHandler);
      if ((modal as any).__escHandler) document.removeEventListener('keydown', (modal as any).__escHandler, true);
      (modal as any).__escHandler = esc; document.addEventListener('keydown', (modal as any).__escHandler, true);
      const lightBtn = document.getElementById('themeLightBtn');
      const darkBtn = document.getElementById('themeDarkBtn');
      const setSeg = () => { const isLight = document.body.getAttribute('data-theme') === 'light'; lightBtn?.classList.toggle('active', isLight); darkBtn?.classList.toggle('active', !isLight); };
      setSeg();
      lightBtn?.addEventListener('click', () => { (w as any).app.theme = 'light'; (w as any).app.applyTheme(); setSeg(); (w as any).app.savePrefs?.(); });
      darkBtn?.addEventListener('click', () => { (w as any).app.theme = 'dark'; (w as any).app.applyTheme(); setSeg(); (w as any).app.savePrefs?.(); });

      const stats = document.getElementById('statsBar');
      const chk = document.getElementById('showStatsToggle') as HTMLInputElement | null;
      const current = localStorage.getItem('ZenBoard_showStats');
      const show = current === null ? true : current === 'true';
      if (chk) { chk.checked = show; }
      const applyStats = (val:boolean) => { if (stats) stats.style.display = val ? 'grid' : 'none'; localStorage.setItem('ZenBoard_showStats', String(val)); };
      applyStats(show);
      chk?.addEventListener('change', (e:any) => applyStats(!!e.target.checked));

      document.getElementById('openCustomizeColumnsBtn')?.addEventListener('click', () => { try { (w as any).closeSettingsModal?.(); } catch {} setTimeout(() => { (w as any).app.openCustomizeColumnsModal?.(); }, 0); });
      document.getElementById('clearAllWipBtn')?.addEventListener('click', () => { try { Object.keys((w as any).app.wipLimits || {}).forEach(k => (w as any).app.setWipLimit?.(k, null)); (w as any).Notifications?.showNotification('WIP limits cleared', 'All columns have no WIP limit now', null, 'info'); } catch {} });

      const inBtn = document.getElementById('settingsSignInBtn');
      const outBtn = document.getElementById('settingsSignOutBtn');
      const loggedIn = !!(w as any).RemoteStorage?.isLoggedIn?.();
      if (inBtn) inBtn.style.display = loggedIn ? 'none' : '';
      if (outBtn) outBtn.style.display = loggedIn ? '' : 'none';
      inBtn?.addEventListener('click', () => { (w as any).openAuthModal(); });
      outBtn?.addEventListener('click', () => { (w as any).signOut(); });

      const form = document.getElementById('settingsForm');
      form?.addEventListener('submit', (e:any) => { e.preventDefault(); (w as any).closeSettingsModal(); });
    } catch {}
  };
  (w as any).closeSettingsModal = () => { const modal = document.getElementById('settingsModal'); modal?.classList.remove('show'); document.body.classList.remove('modal-open'); if ((modal as any)?.__overlayHandler) { modal.removeEventListener('click', (modal as any).__overlayHandler); (modal as any).__overlayHandler = null; } if ((modal as any)?.__escHandler) { document.removeEventListener('keydown', (modal as any).__escHandler, true); (modal as any).__escHandler = null; } };

  // Wire settings button with visual flash + debug to assist debugging in TS/Next.js path
  (function enableSettingsButton(){
    function wire() {
      try {
        const btn = document.getElementById('settingsBtn');
        if (!btn) { console.debug('[src/app.ts] settingsBtn not found'); return; }
        console.debug('[src/app.ts] wiring settingsBtn click handler');
        btn.addEventListener('click', (e:any) => {
          try { (btn as HTMLElement).style.outline = '3px solid rgba(30,144,255,0.95)'; setTimeout(() => { (btn as HTMLElement).style.outline = ''; }, 600); } catch (err) {}
          console.debug('[src/app.ts] settingsBtn clicked');
          try { (w as any).openSettingsModal(); } catch (err) { console.error('[src/app.ts] openSettingsModal threw', err); }
        });
        btn.addEventListener('keydown', (e:any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (btn as HTMLElement).click(); } });
      } catch (e) { console.error('[src/app.ts] enableSettingsButton error', e); }
    }
    window.addEventListener('DOMContentLoaded', wire);
    if (document.readyState === 'interactive' || document.readyState === 'complete') setTimeout(wire, 0);
  })();

  (w as any).scrollToColumn = (columnId:string) => { try { const el = document.querySelector(`section.column[data-column-id="${columnId}"]`) || document.querySelector(`[data-column-id="${columnId}"]`); if (!el) return; (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => { (window as any).activateColumn?.(el, { pulse: true }); }, 350); } catch {} };

  (w as any).activateColumn = function(el:any, opts:any = {}) {
    try {
      document.querySelectorAll('section.column.active').forEach(node => (node as HTMLElement).classList.remove('active'));
      (el as HTMLElement).classList.add('active');
      try {
        const id = (el as HTMLElement).getAttribute('data-column-id');
        const nav = document.getElementById('bottomNav');
        if (id && nav) {
          nav.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
          const btn = nav.querySelector(`.bn-item[data-target="${id}"]`);
          if (btn) { btn.classList.add('active'); const accent = getComputedStyle(el as Element).getPropertyValue('--col-accent').trim(); if (accent) nav.style.setProperty('--bn-active', accent); }
        }
      } catch {}
      if (opts.pulse) {
        (el as HTMLElement).classList.add('pulse-once'); (el as HTMLElement).classList.add('flash-accent'); setTimeout(() => (el as HTMLElement).classList.remove('pulse-once'), 700); setTimeout(() => (el as HTMLElement).classList.remove('flash-accent'), 800);
      }
    } catch {}
  };

  // Column observer omitted for brevity; keep original behavior by leaving hook points intact

  // Guest banner
  (function wireGuestBanner(){
    function handleActivate(e?: any){ if (e) e.preventDefault(); try { (w as any).openHelpModal('helpPrivacy'); } catch { (w as any).openHelpModal(); } }
    window.addEventListener('DOMContentLoaded', () => {
      const banner = document.getElementById('guestBanner');
      if (!banner) return; banner.addEventListener('click', handleActivate); banner.addEventListener('keydown', (e:any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(e); } });
    });
  })();

  // Stats pulse observer and make stat cards open the Stats modal (restores pre-conversion behavior)
  (function pulseStatsOnChange(){
    try {
      const ids = ['totalTasks','completedTasks','inProgressTasks','productivityScore','overdueInfo'];
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'childList' && (m.target as HTMLElement).classList) {
            try { (m.target as HTMLElement).classList.add('pulse'); } catch {}
            setTimeout(() => { try { (m.target as HTMLElement).classList.remove('pulse'); } catch {} }, 650);
          }
        }
      });
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el, { childList: true });
      });
    } catch {}
  })();

  // Make stat cards open the Stats modal (keyboard & click)
  (function enableStatsClick(){
    function wire() {
      try {
        const cards = Array.from(document.querySelectorAll('#statsBar .stat-card'));
        console.debug('[src/app.ts] wiring stat-card handlers, found', cards.length);
        cards.forEach((card:any) => {
          (card as HTMLElement).onclick = () => {
            console.debug('[src/app.ts] stat-card clicked');
            try { (card as HTMLElement).style.outline = '3px solid rgba(220,20,60,0.95)'; setTimeout(() => { (card as HTMLElement).style.outline = ''; }, 600); } catch (e) {}
            (w as any).openStatsModal?.();
          };
          (card as HTMLElement).onkeydown = (e:any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); console.debug('[src/app.ts] stat-card key activated', e.key); try { (card as HTMLElement).style.outline = '3px solid rgba(220,20,60,0.95)'; setTimeout(() => { (card as HTMLElement).style.outline = ''; }, 600); } catch (e) {} (w as any).openStatsModal?.(); } };
        });
      } catch {}
    }
    window.addEventListener('DOMContentLoaded', wire);
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      setTimeout(wire, 0);
    }
  })();

  // Auth modal wiring: inject legacy markup and wire handlers so the TS runtime behaves like the original
  (function authModalController(){
    let signUpMode = false;

    function updateAuthButtons() {
      try {
        const logged = (w as any).RemoteStorage?.isLoggedIn?.();
        const inBtn = document.getElementById('authSignInBtn');
        const outBtn = document.getElementById('authSignOutBtn');
        if (inBtn) (inBtn as HTMLElement).style.display = logged ? 'none' : '';
        if (outBtn) (outBtn as HTMLElement).style.display = logged ? '' : 'none';
      } catch {}
    }

    function ensureAuthMarkup(modal: HTMLElement) {
      if (modal.querySelector('#authForm')) return;
      // Use the same structure as the original index.html to reuse CSS rules
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title" id="authTitle">Sign In</h2>
            <button class="close-btn" id="authCloseBtn" aria-label="Close">&times;</button>
          </div>
          <form id="authForm" class="form-grid">
            <div class="segmented" id="authModeTabs" role="tablist" aria-label="Authentication mode">
              <button type="button" id="authTabIn" class="seg-btn active" role="tab" aria-selected="true" aria-controls="authForm">Sign In</button>
              <button type="button" id="authTabUp" class="seg-btn" role="tab" aria-selected="false" aria-controls="authForm">Sign Up</button>
            </div>
            <div class="form-group">
              <label class="form-label" for="authEmail">Email</label>
              <div class="input-with-icon">
                <span class="input-icon" aria-hidden="true">📧</span>
                <input type="email" class="form-input" id="authEmail" placeholder="you@example.com" required autocomplete="email">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="authPassword">Password</label>
              <div class="input-with-icon">
                <span class="input-icon" aria-hidden="true">🔒</span>
                <input type="password" class="form-input" id="authPassword" placeholder="At least 8 characters" required autocomplete="current-password">
                <button type="button" class="input-affix" id="authPasswordToggle" aria-label="Show password">👁️</button>
              </div>
              <div class="form-hint" id="authHint">We’ll never share your email. Your board can be encrypted with your passphrase.</div>
            </div>
            <div class="form-error" id="authError" role="alert" style="display:none"></div>
            <div class="form-actions">
              <div class="left-actions"></div>
              <div class="right-actions">
                <button type="button" class="btn btn-ghost" id="authCancelBtn">Cancel</button>
                <button type="submit" class="btn btn-primary" id="authSubmitBtn">Sign In</button>
              </div>
            </div>
            <div style="text-align:center;margin-top:.5rem;">
              <a href="#" id="toggleAuthLink">Need an account? Sign Up</a>
            </div>
          </form>
        </div>
      `;

      // wire handlers for inserted controls
      const form = modal.querySelector('#authForm') as HTMLFormElement | null;
      const closeBtn = modal.querySelector('#authCloseBtn') as HTMLElement | null;
      const cancelBtn = modal.querySelector('#authCancelBtn') as HTMLElement | null;
      const toggleLink = modal.querySelector('#toggleAuthLink') as HTMLElement | null;
      const tabIn = modal.querySelector('#authTabIn') as HTMLElement | null;
      const tabUp = modal.querySelector('#authTabUp') as HTMLElement | null;
      const pwToggle = modal.querySelector('#authPasswordToggle') as HTMLElement | null;

      if (form) form.addEventListener('submit', handleAuthSubmit as any);
      if (closeBtn) closeBtn.addEventListener('click', () => (w as any).closeAuthModal?.());
      if (cancelBtn) cancelBtn.addEventListener('click', () => (w as any).closeAuthModal?.());
      if (toggleLink) toggleLink.addEventListener('click', (e) => { e.preventDefault(); (w as any).toggleAuthMode?.(); });
      tabIn?.addEventListener('click', () => { signUpMode = false; updateAuthUI(); });
      tabUp?.addEventListener('click', () => { signUpMode = true; updateAuthUI(); });
      pwToggle?.addEventListener('click', () => {
        const input = modal.querySelector('#authPassword') as HTMLInputElement | null;
        if (!input) return; const isPw = input.type === 'password'; input.type = isPw ? 'text' : 'password'; pwToggle.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
      });
    }

    (w as any).openAuthModal = () => {
      try {
        const modal = document.getElementById('authModal');
        if (!modal) return;
        ensureAuthMarkup(modal as HTMLElement);
        signUpMode = false; updateAuthUI();
        document.body.classList.add('modal-open');
        if (document.body) (document.body as HTMLElement).style.overflow = 'hidden';
        modal.classList.add('show');
        modal.style.position = 'fixed'; modal.style.left = '0'; modal.style.top = '0'; modal.style.width = '100%'; modal.style.height = '100%';
        modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
        modal.style.background = 'rgba(0,0,0,0.45)'; modal.style.zIndex = '9999';
        const dialog = modal.querySelector('.modal-content') as HTMLElement | null;
        if (dialog) {
          dialog.style.zIndex = '10000'; dialog.style.position = 'relative'; dialog.style.maxWidth = '520px'; dialog.style.width = '90%'; dialog.style.margin = '0 auto';
        }
        const overlay = (e:any) => { if (e.target === modal) (w as any).closeAuthModal?.(); };
        const esc = (e:any) => { if (e.key === 'Escape') { e.preventDefault(); (w as any).closeAuthModal?.(); } };
        if ((modal as any).__overlayHandler) modal.removeEventListener('click', (modal as any).__overlayHandler);
        (modal as any).__overlayHandler = overlay; modal.addEventListener('click', (modal as any).__overlayHandler);
        if ((modal as any).__escHandler) document.removeEventListener('keydown', (modal as any).__escHandler, true);
        (modal as any).__escHandler = esc; document.addEventListener('keydown', (modal as any).__escHandler, true);
        setTimeout(() => (document.getElementById('authEmail') as HTMLElement | null)?.focus(), 10);
      } catch (e) { console.error(e); }
    };

    (w as any).closeAuthModal = () => {
      try {
        const modal = document.getElementById('authModal');
        modal?.classList.remove('show');
        document.body.classList.remove('modal-open');
        if (document.body) (document.body as HTMLElement).style.overflow = '';
        (document.getElementById('authForm') as HTMLFormElement | null)?.reset();
        if (modal && (modal as any).__overlayHandler) { modal.removeEventListener('click', (modal as any).__overlayHandler); (modal as any).__overlayHandler = null; }
        if (modal && (modal as any).__escHandler) { document.removeEventListener('keydown', (modal as any).__escHandler, true); (modal as any).__escHandler = null; }
        // Remove inline styles applied by openAuthModal so the overlay is actually hidden
        if (modal) {
          try {
            modal.style.display = '';
            modal.style.position = '';
            modal.style.left = '';
            modal.style.top = '';
            modal.style.width = '';
            modal.style.height = '';
            modal.style.background = '';
            modal.style.zIndex = '';
            const dialog = modal.querySelector('.modal-content') as HTMLElement | null;
            if (dialog) {
              dialog.style.zIndex = '';
              dialog.style.position = '';
              dialog.style.maxWidth = '';
              dialog.style.width = '';
              dialog.style.margin = '';
            }
          } catch (e) { /* ignore style clear errors */ }
        }
      } catch (e) { console.error(e); }
    };

    (w as any).toggleAuthMode = () => { signUpMode = !signUpMode; updateAuthUI(); };

    function updateAuthUI() {
      try {
        const title = document.getElementById('authTitle');
        const submit = document.getElementById('authSubmitBtn');
        const link = document.getElementById('toggleAuthLink');
        const tabIn = document.getElementById('authTabIn');
        const tabUp = document.getElementById('authTabUp');
        const pw = document.getElementById('authPassword') as HTMLInputElement | null;
        const email = document.getElementById('authEmail') as HTMLInputElement | null;
        if (title) title.textContent = signUpMode ? 'Sign Up' : 'Sign In';
        if (submit) submit.textContent = signUpMode ? 'Sign Up' : 'Sign In';
        if (link) link.textContent = signUpMode ? 'Have an account? Sign In' : 'Need an account? Sign Up';
        if (tabIn && tabUp) {
          tabIn.classList.toggle('active', !signUpMode);
          tabUp.classList.toggle('active', signUpMode);
          tabIn.setAttribute('aria-selected', String(!signUpMode));
          tabUp.setAttribute('aria-selected', String(signUpMode));
        }
        const hint = document.getElementById('authHint');
        if (hint) hint.textContent = signUpMode ? 'Create your account. You may need to confirm your email before signing in.' : 'Welcome back. Enter your credentials to continue.';
        if (pw) { pw.setAttribute('autocomplete', signUpMode ? 'new-password' : 'current-password'); pw.placeholder = signUpMode ? 'At least 8 characters' : '••••••••'; }
        if (email) email.setAttribute('autocomplete', 'email');
      } catch (e) { console.error(e); }
    }

    async function handleAuthSubmit(e:any) {
      try {
        e.preventDefault();
        const email = (document.getElementById('authEmail') as HTMLInputElement | null)?.value.trim();
        const password = (document.getElementById('authPassword') as HTMLInputElement | null)?.value;
        if (!email || !password) return;
        const submitBtn = document.getElementById('authSubmitBtn') as HTMLButtonElement | null;
        const errBox = document.getElementById('authError');
        if (errBox) { errBox.style.display = 'none'; errBox.textContent = ''; }
        try {
          if (!(w as any).RemoteStorage?.isReady?.()) throw new Error('Cloud sync not configured');
          if (submitBtn) { submitBtn.disabled = true; (submitBtn as any).dataset.prev = submitBtn.textContent; submitBtn.textContent = 'Working…'; }
          let result:any;
          if (signUpMode) {
            result = await (w as any).RemoteStorage.signUp(email, password);
            if (!result?.session) {
              (w as any).closeAuthModal?.();
              (w as any).Notifications?.showNotification('Confirm your email', `We sent a confirmation link to ${email}. Please verify your email to finish creating your account, then Sign In.`, null, 'info');
              return;
            }
          } else {
            result = await (w as any).RemoteStorage.signIn(email, password);
          }
          if (result?.user && !(result.user?.email_confirmed_at || result.user?.confirmed_at)) {
            try { await (w as any).RemoteStorage?.signOut?.(); } catch {}
            (w as any).Notifications?.showNotification('Email not verified', 'Please confirm your email before signing in.', null, 'warn');
            return;
          }
          let pass = localStorage.getItem('ZenBoard_passphrase') || '';
          while (!pass) {
            try { pass = await (w as any).Passphrase.ask({ mode: 'set', label: 'Create a passphrase to encrypt your data (you will need this on other devices)' }); } catch { pass = ''; }
            if (pass) localStorage.setItem('ZenBoard_passphrase', pass);
          }
          (w as any).RemoteStorage.setPassphrase(pass);
          (w as any).closeAuthModal?.();
          updateAuthButtons();
          (w as any).app.syncWithRemote?.();
          (w as any).Notifications?.showNotification('Welcome', 'You are signed in', null, 'info');
        } catch (err:any) {
          console.error(err);
          const msg = err?.message || 'Unable to authenticate';
          (w as any).Notifications?.showNotification('Auth error', msg, null, 'error');
          const errBox = document.getElementById('authError');
          if (errBox) { errBox.textContent = msg; errBox.style.display = 'block'; }
        } finally {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = (submitBtn as any).dataset.prev || (signUpMode ? 'Sign Up' : 'Sign In'); }
        }
      } catch (e) { console.error(e); }
    }

    (w as any).signOut = async () => {
      try { await (w as any).RemoteStorage?.signOut?.(); updateAuthButtons(); (w as any).Notifications?.showNotification('Signed out', 'Local data is still available', null, 'info'); } catch (err) { console.error(err); }
    };

    // Wire form and UI toggles after DOM is ready (in case markup existed in server HTML)
    window.addEventListener('DOMContentLoaded', () => {
      try {
        document.getElementById('authForm')?.addEventListener('submit', handleAuthSubmit as any);
        const tabIn = document.getElementById('authTabIn');
        const tabUp = document.getElementById('authTabUp');
        tabIn?.addEventListener('click', () => { if (signUpMode) { signUpMode = false; updateAuthUI(); } });
        tabUp?.addEventListener('click', () => { if (!signUpMode) { signUpMode = true; updateAuthUI(); } });
        const toggle = document.getElementById('authPasswordToggle');
        toggle?.addEventListener('click', () => {
          const input = document.getElementById('authPassword') as HTMLInputElement | null;
          if (!input) return; const isPw = input.type === 'password'; input.type = isPw ? 'text' : 'password'; toggle.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
        });
      } catch (e) { console.error(e); }
    });

    // Try to update buttons and restore passphrase if a session exists
    setTimeout(async () => {
      try {
        updateAuthButtons();
        let pass = localStorage.getItem('ZenBoard_passphrase');
        if ((w as any).RemoteStorage?.isLoggedIn?.()) {
          while (!pass) {
            try { pass = await (w as any).Passphrase.ask({ mode: 'unlock', label: 'Enter your encryption passphrase to unlock your cloud data' }); } catch { pass = ''; }
            if (pass) localStorage.setItem('ZenBoard_passphrase', pass); else break;
          }
          if (pass && (w as any).RemoteStorage?.setPassphrase) (w as any).RemoteStorage.setPassphrase(pass);
        }
      } catch (e) { console.error(e); }
    }, 300);
  })();

  // Ensure auth modal markup exists (Next.js placeholder may be empty)
  window.addEventListener('DOMContentLoaded', () => {
    try {
      const authModal = document.getElementById('authModal');
      if (!authModal) return;
      // if inner content already present, skip
      if (authModal.querySelector('#authForm')) return;
      authModal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h2 id="authTitle">Sign In</h2>
              <button class="close" onclick="(window as any).closeAuthModal && window.closeAuthModal()">×</button>
            </div>
            <div class="modal-body">
              <div id="authError" style="display:none;color:red;margin-bottom:8px"></div>
              <form id="authForm">
                <label>Email<br><input id="authEmail" type="email" required /></label><br>
                <label>Password<br><input id="authPassword" type="password" required /></label>
                <button id="authSubmitBtn" type="submit">Sign In</button>
              </form>
              <p id="authHint">Enter credentials to sign in.</p>
              <p><a href="#" id="toggleAuthLink" onclick="(window as any).toggleAuthMode && ((window as any).toggleAuthMode(), event.preventDefault())">Need an account? Sign Up</a></p>
            </div>
          </div>
        </div>
      `;
      // wire submit (in case DOMContentLoaded already passed)
      document.getElementById('authForm')?.addEventListener('submit', (e) => { e.preventDefault(); (window as any).handleAuthSubmit ? (window as any).handleAuthSubmit(e) : (document.getElementById('authForm') as HTMLFormElement).dispatchEvent(new Event('submit')); });
    } catch (e) { console.error(e); }
  });

  // Delegated click handler as a robust fallback for closing the auth modal
  // Use `closest` so clicks on inner elements (icons/spans) are detected. Also
  // treat clicks on the modal overlay (outside .modal-content) as a close.
  document.addEventListener('click', (ev) => {
    try {
      const t = ev.target as HTMLElement | null;
      if (!t) return;
      const authModal = document.getElementById('authModal');
      if (!authModal) return;

      // If click was on a known close control (or its child), close the modal
      const closeSelector = '#authModal #authCloseBtn, #authModal #authCancelBtn, #authModal .close-btn, #authModal .close';
      const closeEl = t.closest(closeSelector) as HTMLElement | null;
      if (closeEl && authModal.contains(closeEl)) {
        (w as any).closeAuthModal?.();
        return;
      }

      // If click happened inside the authModal but outside the dialog (.modal-content), treat as overlay click
      const insideDialog = t.closest('#authModal .modal-content') || t.closest('#authModal .modal-dialog');
      if (authModal.contains(t) && !insideDialog) {
        (w as any).closeAuthModal?.();
      }
    } catch (e) { /* ignore */ }
  });
})();
