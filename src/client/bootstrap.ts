// Client bootstrap: import all legacy-ported modules to attach globals and then initialize app on DOMContentLoaded
import './utils';
import './crypto';
import './storage';
import './notifications';
import './remoteStorage';
import './select';
import './board/core';
import './board/render';
import './board/filters';
import './board/interactions';
import './board/modals_and_crud';
import './board/ui_and_events';
import './app';

// Expose a small init for Next page to call
export function initClient() {
  if (typeof window === 'undefined') return;
  try {
    console.log('bootstrap: initClient() called', { KanbanBoard: !!(window as any).KanbanBoard, app: !!(window as any).app });
    // If the legacy `app` module already constructed the application (it prompts
    // for a passphrase before creating `window.app`), avoid creating a second
    // instance which may run without the passphrase and overwrite the working
    // instance. Only create when `KanbanBoard` exists and `app` is not set.
    if (!(window as any).KanbanBoard) return;
    if ((window as any).app) return;
    setTimeout(() => { try { (window as any).app = new (window as any).KanbanBoard(); } catch (e) { console.warn('Failed to init KanbanBoard', e); } }, 0);
  } catch (e) { console.warn(e); }
}

// Populate sample data if the constructed app has no cards — helpful fallback
// for development and to surface the UI when saved data/decryption paths are not
// producing visible cards.
setTimeout(() => {
  try {
    const app = (window as any).app;
    if (!app) return;
    const empty = Object.values(app.boards || {}).every((arr:any) => Array.isArray(arr) && arr.length === 0);
    if (empty) {
      console.log('bootstrap: app has no cards — populating sample data');
      try { app.loadSampleData?.(); } catch (e) { console.warn('bootstrap: loadSampleData failed', e); }
      try { app.renderBoard?.(); app.updateStats?.(); app.attachEventListeners?.(); } catch (e) {}
    }
  } catch (e) { console.warn(e); }
}, 250);
