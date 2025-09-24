(() => {
  const global = window as any;
  const { escapeHTML } = (global.Utils || {});
  function showNotification(title: string, message?: string|null, action: any = null, type = 'success') {
    const cont = document.getElementById('toasts') || (function(){ const d = document.createElement('div'); d.id = 'toasts'; d.style.position = 'fixed'; d.style.top = '1rem'; d.style.right = '1rem'; d.style.zIndex = '9999'; document.body.appendChild(d); return d; })();
    try { const limit = 4; const nodes = cont.querySelectorAll('.notification'); if (nodes.length >= limit) nodes[0].remove(); } catch {}
    const toast = document.createElement('div'); toast.className = `notification ${type}`;
    toast.innerHTML = `\n      <div class="notification-icon">${type === 'error' ? '⛔' : type === 'warn' ? '⚠️' : type === 'info' ? 'ℹ️' : '✓'}</div>\n      <div class="notification-content">\n        <div class="notification-title">${escapeHTML ? escapeHTML(title) : title}</div>\n        <div class="notification-message">${escapeHTML ? escapeHTML(message || '') : (message||'')}</div>\n      </div>\n      <div class="notification-actions">\n        ${action && action.actionLabel ? `<button class="btn btn-ghost">${escapeHTML ? escapeHTML(action.actionLabel) : action.actionLabel}</button>` : ''}\n        <button class="toast-close" aria-label="Dismiss">✖</button>\n      </div>\n    `;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    cont.appendChild(toast);
    const dismiss = () => { toast.style.animation = 'slideOutRight 0.35s ease forwards'; setTimeout(() => { requestAnimationFrame(() => toast.remove()); }, 300); };
    const closeBtn = toast.querySelector('.toast-close') as HTMLElement | null; closeBtn?.addEventListener('click', dismiss);
    if (action && action.onAction) { const actionBtn = toast.querySelector('.btn'); actionBtn?.addEventListener('click', () => { action.onAction(); dismiss(); }); }
    setTimeout(dismiss, 3500);
  }
  (window as any).Notifications = { showNotification };
})();
