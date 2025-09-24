import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Dynamically load the client bootstrap which attaches globals and starts the app
    import('../client/bootstrap').then((m) => {
      if (m.initClient) m.initClient();
    });
  }, []);

  // The legacy app expects a lot of DOM elements with specific IDs and some
  // inline `onclick` attributes that call global functions (e.g. showAddCardModal()).
  // To preserve behavior we inject the original page body markup as raw HTML so
  // the converted client scripts can find the nodes they need.
  const html = `
  <div class="container">
    <header>
      <div class="logo" aria-label="ZenBoard Home">
        <div class="logo-icon" aria-hidden="true">⚡</div>
        <h1>ZenBoard</h1>
      </div>
      <div class="header-actions">
        <div class="search-bar" role="search">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="Search tasks..." id="searchInput" aria-label="Search tasks (Ctrl+/)">
        </div>
        <button class="btn" onclick="showFilterModal()" aria-label="Open filters" id="filterBtn">
          <span>🔧</span> Filter <span id="filterBadge" class="badge" style="display:none">•</span>
        </button>
        <button class="btn btn-primary" onclick="showAddCardModal()" aria-label="Create new task">
          <span>➕</span> New Task
        </button>
        <div class="auth-controls">
          <button class="btn" id="authSignInBtn" onclick="openAuthModal()">Sign In</button>
          <button class="btn" id="authSignOutBtn" onclick="signOut()" style="display:none">Sign Out</button>
        </div>
      </div>
      <div class="header-utilities">
        <button class="theme-toggle" onclick="toggleTheme()" title="Toggle theme" aria-label="Toggle theme">
          <span id="themeIcon">🌙</span>
        </button>
        <button class="btn btn-ghost" id="settingsBtn" onclick="openSettingsModal()" aria-label="Open Settings" title="Settings">⚙️</button>
        <button class="btn btn-ghost" id="helpBtn" onclick="openHelpModal()" aria-label="Open Help" title="Help">❓</button>
        <button class="btn btn-ghost header-toggle" id="headerToggleBtn" onclick="toggleHeader()" aria-label="Hide header">
          <span class="icon" aria-hidden="true">👁️</span>
          <span class="label">Hide</span>
        </button>
      </div>
    </header>

    <div class="stats-bar" id="statsBar">
      <div class="stat-card" role="button" tabindex="0">
        <div class="stat-label">Total Tasks</div>
        <div class="stat-value" id="totalTasks">0</div>
        <div class="stat-change">You’re on a roll ⚡</div>
      </div>
      <div class="stat-card" role="button" tabindex="0">
        <div class="stat-label">Completed</div>
        <div class="stat-value" id="completedTasks">0</div>
        <div class="stat-change">Nice work! 🎉</div>
      </div>
      <div class="stat-card" role="button" tabindex="0">
        <div class="stat-label">In Progress</div>
        <div class="stat-value" id="inProgressTasks">0</div>
        <div class="stat-change">Keep going 💪</div>
      </div>
      <div class="stat-card" role="button" tabindex="0">
        <div class="stat-label">Productivity</div>
        <div class="stat-value" id="productivityScore">0%</div>
        <div class="stat-change" id="overdueInfo" aria-live="polite" aria-label="Overdue tasks">0 overdue</div>
      </div>
    </div>

    <main class="board-wrapper" aria-label="Kanban Board">
      <div id="guestBanner" class="guest-banner" role="button" tabindex="0" aria-label="Using guest data — Learn about privacy and sync" style="display:none">
        <span>Using guest data. ZenBoard encrypts your board with a passphrase on this device and in the cloud. Sign in to sync across devices.</span>
      </div>
      <div class="board" id="board" aria-live="polite">
        <!-- Columns render here -->
      </div>
    </main>
    <nav class="bottom-nav" id="bottomNav" aria-label="Quick navigation"></nav>
    <button class="fab-new" id="fabNewTask" onclick="showAddCardModal()" aria-label="New Task">➕</button>
  </div>

  <!-- Modals & helpers (kept because client code expects them) -->
  <div class="modal" id="cardModal" aria-modal="true" role="dialog" aria-labelledby="modalTitle">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title" id="modalTitle">Create New Task</h2>
        <button class="close-btn" onclick="closeModal()" aria-label="Close">&times;</button>
      </div>
      <form id="cardForm" class="form-grid">
        <div class="form-group">
          <label class="form-label" for="cardTitle">Task Title *</label>
          <input type="text" class="form-input" id="cardTitle" placeholder="Enter task title" required autocomplete="off">
        </div>
        <div class="form-group">
          <label class="form-label" for="cardDescription">Description</label>
          <textarea class="form-textarea" id="cardDescription" placeholder="Add a detailed description..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="cardColumn">Column</label>
            <select class="form-select" id="cardColumn">
              <option value="longterm">📌 Long-Term</option>
              <option value="nearfuture">⏳ Soon</option>
              <option value="asap">⚡ In Progress</option>
              <option value="done">✅ Done</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="cardPriority">Priority</label>
            <select class="form-select" id="cardPriority">
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="cardCategory">Category</label>
            <select class="form-select" id="cardCategory"></select>
          </div>
          <div class="form-group">
            <label class="form-label" for="cardDueDate">Due Date</label>
            <input type="date" class="form-input" id="cardDueDate">
          </div>
        </div>
        <div class="form-actions">
          <div class="left-actions">
            <button type="button" class="btn btn-danger" id="deleteBtn" style="display:none">🗑 Delete</button>
          </div>
          <div class="right-actions">
            <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveBtn">Save Task</button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <div class="modal" id="filterModal" aria-modal="true" role="dialog" aria-labelledby="filterTitle">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title" id="filterTitle">Filters</h2>
        <button class="close-btn" onclick="closeFilterModal()" aria-label="Close">&times;</button>
      </div>

      <div class="filter-groups">
        <div class="form-group">
          <div class="form-label">Priority</div>
          <div class="chips" id="priorityChips">
            <button class="chip" data-priority="high">High</button>
            <button class="chip" data-priority="medium">Medium</button>
            <button class="chip" data-priority="low">Low</button>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <div class="form-label">Category</div>
            <div class="chips" id="categoryChips" role="group" aria-label="Filter by category"></div>
          </div>
        </div>

        <div class="form-group">
          <div class="form-label">Due</div>
          <div class="chips" id="dueChips" role="group" aria-label="Filter by due date"></div>
        </div>
      </div>

      <div class="filter-footer">
        <button class="btn btn-ghost" onclick="resetFilters()">Reset</button>
        <button class="btn btn-primary" onclick="applyFilters()">Apply</button>
      </div>
    </div>
  </div>

  <!-- WIP, customize, stats, help, settings, auth, passphrase modals and toasts -->
  <div class="modal" id="wipModal" aria-modal="true" role="dialog" aria-labelledby="wipTitle"></div>
  <div class="modal" id="customizeColumnsModal" aria-modal="true" role="dialog" aria-labelledby="ccTitle"></div>
  <div class="modal" id="statsModal" aria-modal="true" role="dialog" aria-labelledby="statsTitle"></div>
  <div class="modal" id="helpModal" aria-modal="true" role="dialog" aria-labelledby="helpTitle"></div>
  <div class="modal" id="settingsModal" aria-modal="true" role="dialog" aria-labelledby="settingsTitle"></div>
  <div id="toasts" class="toast-container" aria-live="polite" aria-atomic="true"></div>
  <div class="modal" id="authModal" aria-modal="true" role="dialog" aria-labelledby="authTitle"></div>
  <!-- Passphrase Modal (full markup required by legacy scripts) -->
  <div class="modal" id="passphraseModal" aria-modal="true" role="dialog" aria-labelledby="ppTitle" aria-describedby="ppDesc">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title" id="ppTitle">Encryption Passphrase</h2>
        <button class="close-btn" id="ppCloseBtn" aria-label="Close">&times;</button>
      </div>
      <form id="ppForm" class="form-grid">
        <div class="form-group">
          <div class="form-label" id="ppLabel">Enter your passphrase to unlock your board</div>
          <div class="input-with-icon">
            <span class="input-icon" aria-hidden="true">🔐</span>
            <input type="password" class="form-input" id="ppInput" placeholder="Enter passphrase" autocomplete="current-password" required>
            <button type="button" class="input-affix" id="ppToggle" aria-label="Show passphrase">👁️</button>
          </div>
          <div class="form-error" id="ppError" role="alert" style="display:none"></div>
          <div class="form-hint" id="ppDesc">
            Your passphrase protects your board if someone gets access to this device or your cloud account. We turn your passphrase into a key on your device and lock your board before saving it; only encrypted data is stored.
            <ul style="margin:.5rem 0 0 1rem;">
              <li><strong>Why:</strong> Keeps your tasks private locally and in the cloud.</li>
              <li><strong>How:</strong> Your passphrase becomes a key on your device; your board is encrypted before it’s saved.</li>
              <li><strong>Important:</strong> If you forget your passphrase, your data can’t be recovered.</li>
            </ul>
          </div>
        </div>
        <div class="form-actions">
          <div class="left-actions">
            <button type="button" class="btn btn-ghost" id="ppLearnMoreBtn" title="Learn more about encryption">Learn more</button>
          </div>
          <div class="right-actions">
            <button type="button" class="btn btn-ghost" id="ppCancelBtn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="ppSubmitBtn">Continue</button>
          </div>
        </div>
      </form>
    </div>
  </div>
  
    <script src="/js/config.js"></script>
    <script type="module">
      if (window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey) {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        window.supabase = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
      }
    </script>
    <script>
      (function ensureRemoteInit() {
        const opts = {
          schema: (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.schema) || 'public',
          table: (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.table) || 'boards'
        };
        const tryInit = () => {
          if (window.supabase && window.RemoteStorage?.init) {
            window.RemoteStorage.init(window.supabase, opts);
            return true;
          }
          return false;
        };
        if (!tryInit()) {
          let retries = 100; // ~5s
          const id = setInterval(() => {
            if (tryInit() || --retries <= 0) clearInterval(id);
          }, 50);
        }
      })();
    </script>

  `;

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
