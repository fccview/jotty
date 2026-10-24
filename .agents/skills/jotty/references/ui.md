# UI

Server page fetches, passes props into a `"use client"` `*PageClient`. Do not fetch in a new client wrapper what the page already can pass down.

## Where things live

Feature UI: `app/_components/FeatureComponents/<Feature>/`
Shared cards, modals, inputs: `app/_components/GlobalComponents/`

Reuse what is there. A second modal stack or a one-off button with inline styles is how the UI starts looking like five apps. Global buttons and form elements already exist.

Icons are `hugeicons-react` and `@hugeicons/react`. Do not mix in another icon set.

Themes are CSS variables via `next-themes` and `ThemeProvider`. Do not hardcode colours. Dark is the design default. Check light if you change layout.

DnD is `@dnd-kit`. Toasts are `useToast()` from `ToastProvider`. Short, past tense, translated.

## Zustand

Local UI only. User, settings and sharing live in `AppModeProvider`. Notes and checklists are fetched by whatever shows them. If you put server data in a store you now have two sources and they will drift.

Subscribe with a selector (`useSidebarStore((s) => s.sidebarWidth)`). A whole-store subscription re-renders on every change, and the sidebar store changes on every scroll.

Files end in `-store.ts`, export `useXxxStore`. Persist is opt-in.

Existing:

- `ui-store` is `isDragging` only
- `settings-store` holds theme and `viewMode` (card / list / grid), persisted
- `sidebar-store` collapsed categories/tags and width, persisted. `scrollTop`, `mode` and `search` are not. The notes and checklists sidebar keeps its scroll in `useSidebarAnchor` instead, a row key plus offset per mode, because a pixel offset drifts when rows above it change
- `sidebar-rows-store` sidebar pages fetched per folder, keyed by stamp, not persisted
- `notes-store` and `editor-activity-store` for editor UI flags
- `modal-store`, `dnd/drag-store`

`modal-store` writes `localStorage` itself, not zustand persist. Extend one of these if the need overlaps. A new store needs a reason.

## Big libraries

Assume somebody has a million notes. A client component gets a page, not the library. List pages page on the server (`useServerBrowse`), pickers ask the server and cap their results, so a search box inside a picker searches the server too, not just what it was handed.

The sidebar is rows (`sidebar-tree-utils`), seeded by the layout's snapshot and fetched a folder page at a time from `/api/ui/sidebar`. It renders as a plain list up to `SIDEBAR_VIRTUAL_THRESHOLD` rows and virtualises past that. Folders start open. Its search link filters the tree in place. It is not Cmd+K.

## i18n

`next-intl` 4. Client: `useTranslations()`. Server: `getTranslations()` from `next-intl/server`.

Add keys to `app/_translations/en.json`. That file has to be complete. The other locales fall back. Filling them in is community work. Klingon and pirate are real files, not jokes you skip.

No hardcoded user-facing strings. No concatenating translated bits. ICU placeholders: `t("welcome", { name })`. Rich text uses `t.rich()`, not `dangerouslySetInnerHTML` on a translation.

Operator docs: `howto/TRANSLATIONS.md`. Custom override file via env is an instance thing, not how you ship a feature.

## Shortcuts

`useShortcuts` + `ShortcutsProvider`. Disable globals while the editor is active. Check the notes/editor activity store. Operator list: `howto/SHORTCUTS.md`.

## PWA

Serwist, `app/sw.ts`, registered by `GlobalComponents/Pwa/ServiceWorkerRegister.tsx` against `/api/serwist/sw.js`. Do not cache authenticated API responses in the worker. Do not queue mutations offline unless you are building that feature for real, end to end.

The sidebar's offline copy is the exception, and it is not in the service worker. `_workers/sidebar-offline.worker.ts` stores it in IndexedDB (`_utils/offline/sidebar-cache.ts`) while online, refreshes it after edits, and the login page clears it.

## Pages worth naming correctly

`NotesPageClient`, `KanbanPageClient`, checklist home clients. `NoteClient` / checklist detail clients are the item views. The `PageClient` suffix is the list/shell. Do not name a new nested widget `SomethingPageClient`.
