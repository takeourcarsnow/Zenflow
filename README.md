# ZenBoard (Zenflow)

A compact, privacy-first Kanban board ported into a Next.js app. ZenBoard stores your board locally (encrypted with a passphrase) and can optionally sync to a Supabase backend. This repository contains a TypeScript/Next.js wrapper around a legacy, browser-first JavaScript codebase that attaches a global `KanbanBoard` and bootstraps a DOM-driven UI.

## Key points and quick summary

- Tech: Next.js 13 (React 18) + TypeScript. See `package.json` for versions.
- Legacy client code lives in `src/client/` — the original app was ported to TypeScript modules and exposes globals that the injected HTML expects.
- The Next page (`src/pages/index.tsx`) injects the original HTML markup (via `dangerouslySetInnerHTML`) so the legacy client can find elements by ID and attach handlers.
- Local storage: board data is kept encrypted in the browser (PBKDF2-derived key + AES-GCM). A passphrase is required to encrypt/decrypt. The passphrase is stored locally (in memory/localStorage) — see security notes below.
- Optional remote sync: uses Supabase (the app expects a global `window.SUPABASE_CONFIG` and will create a Supabase client when provided). The repository includes placeholders that reference `public/js/config.js`.

## Repository layout (relevant files)

- `src/pages/` — Next.js pages (`index.tsx` injects the legacy HTML; `_app.tsx` adds global CSS)
- `src/client/` — converted legacy modules. Notable files:
  - `app.ts` — legacy app wiring, modals, and global helpers
  - `bootstrap.ts` — imports client modules and exposes `initClient()` used by the Next page
  - `board/` — core Kanban logic and render/interaction helpers (e.g. `core.ts`, `render.ts`)
- `public/js/config.js` — runtime config loaded by the injected HTML (create/modify this if you want Supabase enabled)
- `styles/` and `public/css/` — CSS for the app UI

## Features

- Offline-first: works entirely in the browser without an account
- Client-side encryption using a passphrase (derived key) before saving
- Optional cloud sync (Supabase) for cross-device sync
- Small, fast Kanban UI with drag/drop, columns templates, WIP limits, filters, and stats

## Running locally

Prerequisites: Node.js 18+ and npm (or pnpm/yarn). Commands shown for Windows PowerShell.

1. Install dependencies

```powershell
npm install
```

2. Start the dev server (default port 3000)

```powershell
npm run dev
```

Open http://localhost:3000 in your browser.

Production build & start

```powershell
npm run build
npm run start
```

Notes

- The page uses a client-side bootstrap (`src/client/bootstrap.ts`) that dynamically imports the legacy modules and calls `initClient()`.
- If no saved/encrypted board is found the client populates sample data to make the UI visible.

## Enabling Supabase (optional cloud sync)

The legacy HTML in `src/pages/index.tsx` references `public/js/config.js` and also checks for `window.SUPABASE_CONFIG`. The app will attempt to create a Supabase client from that object. You can enable cloud sync by creating `public/js/config.js` with the following form (do NOT commit real keys to a public repo):

```javascript
// public/js/config.js
window.SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',
  anonKey: 'your-anon-key',
  schema: 'public', // optional
  table: 'boards'   // optional
};
```

After placing this file, the injected inline script on the page will create a Supabase client and the client code will attempt to initialize `RemoteStorage` using that client.

Important: the app expects `RemoteStorage` and the Supabase client to be available on `window`. See `src/client/remoteStorage.ts` (converted legacy module) for details on how remote operations are implemented.

## Development notes / how it works

- The original app was DOM-first and relied on many elements with specific IDs and inline onclick attributes. To avoid a full rewrite, the Next.js page injects that markup and the converted scripts attach behavior to those nodes.
- The global class `KanbanBoard` is attached to `window` in `src/client/board/core.ts`. The bootstrap logic constructs a `window.app = new KanbanBoard()` instance (after optionally requesting the passphrase).
- The client code uses `localStorage` keys such as `ZenBoardData`, `ZenBoard_passphrase`, and `ZenBoard_showStats` for persistence and preferences.
- If you'd like to modernize the UI, a viable plan is to gradually replace sections of the injected HTML with React components and migrate the relevant client code to call into React-managed state instead of relying on DOM queries.

## Security & privacy notes

- ZenBoard encrypts board data using a passphrase-derived key (PBKDF2 + AES-GCM in the original design). The passphrase is required to decrypt the saved board.
- The current implementation keeps the passphrase in `localStorage` when the app stores it; this is a design trade-off for convenience. If you plan to deploy publicly, consider: never storing the passphrase in persistent storage by default, and offer the user a secure remember-me option instead.
- Never commit real Supabase keys or secrets to the repository. Use environment-specific config files or CI secrets for production deployments.

## Tests & linting

This repository currently does not include automated unit tests or lint scripts. Adding a small Jest + Testing Library suite around the `KanbanBoard` logic (unit tests) would be a logical next step. A TypeScript ESLint config is also recommended for catching typing and style issues.

## Deployment

- Vercel is a natural hosting choice for Next.js apps. Before deploying, either remove/replace the injected `public/js/config.js` usage with proper environment variables or add a server-side injection of `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` that writes `window.SUPABASE_CONFIG` on the page.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Open a PR with a clear description and small increments

If you want to help modernize the app, good first tasks:
- Add unit tests for `src/client/board/core.ts` methods (e.g. `applyColumns`, `saveData`, `syncWithRemote`).
- Replace one small UI area (e.g. stats bar) with a React component and wire it to the `KanbanBoard` instance via a tiny adapter.

## License

This repository does not include a license file. Add a `LICENSE` if you want to make the terms explicit (MIT, Apache-2.0, etc.).

---

If you want, I can also:

- Add a minimal `public/js/config.example.js` with instructions.
- Create a `CONTRIBUTING.md` with recommended dev workflow.
- Add a small test harness to run a handful of unit tests for `KanbanBoard`.

Tell me which of the above you'd like next.
