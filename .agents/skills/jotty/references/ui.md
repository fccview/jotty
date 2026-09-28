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

Local UI only. Hydrated notes, checklists, user, settings, sharing live in `AppModeProvider`. If you put server data in a store you now have two sources and they will drift.

Files end in `-store.ts`, export `useXxxStore`. Persist is opt-in.

Existing:

- `ui-store` is `isDragging` only
- `settings-store` holds theme and `viewMode` (card / list / grid), persisted
- `sidebar-store` collapsed categories/tags, persisted
- `notes-store` and `editor-activity-store` for editor UI flags
- `home-filter-store`, `modal-store`, `dnd/drag-store`

`modal-store` writes `localStorage` itself, not zustand persist. Extend one of these if the need overlaps. A new store needs a reason.

## i18n

`next-intl` 4. Client: `useTranslations()`. Server: `getTranslations()` from `next-intl/server`.

Add keys to `app/_translations/en.json`. That file has to be complete. The other locales fall back. Filling them in is community work. Klingon and pirate are real files, not jokes you skip.

No hardcoded user-facing strings. No concatenating translated bits. ICU placeholders: `t("welcome", { name })`. Rich text uses `t.rich()`, not `dangerouslySetInnerHTML` on a translation.

Operator docs: `howto/TRANSLATIONS.md`. Custom override file via env is an instance thing, not how you ship a feature.

## Shortcuts

`useShortcuts` + `ShortcutsProvider`. Disable globals while the editor is active. Check the notes/editor activity store. Operator list: `howto/SHORTCUTS.md`.

## PWA

Serwist, `app/sw.ts`, registered by `GlobalComponents/Pwa/ServiceWorkerRegister.tsx` against `/api/serwist/sw.js`. Do not cache authenticated API responses in the worker. Do not queue mutations offline unless you are building that feature for real, end to end.

## Pages worth naming correctly

`NotesPageClient`, `KanbanPageClient`, checklist home clients. `NoteClient` / checklist detail clients are the item views. The `PageClient` suffix is the list/shell. Do not name a new nested widget `SomethingPageClient`.
