# Notes

One markdown file per note, YAML frontmatter, uuid in that frontmatter. Storage and lookup: [identity.md](identity.md) and [persistence.md](persistence.md).

## Create / update / delete

`app/_server/actions/note/`. `makeNote` in `creator.ts` is the actual write. `createNote` checks the session, refuses a claimed-name mismatch, then calls it.

`generateUuid()` for identity. `generateUniqueFilename()` for the slug on disk. Those are different values. Retitling may change the filename. It must not change the uuid.

`getNoteById(uuid)` is the reader. `updateNote` / `deleteNote` / move take uuid. Permission via `canReach`.

After a successful write: link index, `broadcast({ type: "note", entityId: uuid })`, audit log.

## Editor

Tiptap 3. `useNoteEditor` owns the lifecycle. Extensions and markdown config live in `_consts` and `_utils/markdown-*`. Extra toys in the editor: Mermaid, Prism, tables, Excalidraw, draw.io. Do not add a second editor stack.

`useNotesStore` / `editor-activity-store` exist so global shortcuts quiet down while typing. Wire new shortcut work through that, or you will steal keystrokes from the editor.

Autosave is a real save. Same permission check, same uuid, same broadcast.

## Frontmatter

`yaml-metadata-utils` and `note/parsers.ts`. Unknown keys are kept (`extraMetadata` / `strayMeta`) so a round-trip does not strip fields we do not know about. Missing uuid on read gets one stamped. That is a migration kindness, not a reason to skip `generateUuid` on create.

## Links

Internal links are uuid-based: `/jotty/<uuid>` and `data-uuid`. `parseInternalLinks` + `updateIndexForItem` keep `.index.json` honest. Convert old path-shaped links to uuid when you already have the note open for another reason. Do not invent a crawler that decrypts bodies to find them.

## History

`app/_server/actions/history`. Optional git repo per user's notes dir, locked. Encrypted notes are not committed. If you add a mutation that changes note bytes, look at whether `commitNote` is called next door.

## Pages

`NotesPageClient` is the list. `NoteClient` is the editor page. Route: `app/(loggedInRoutes)/note/[uuid]/page.tsx`. Force-dynamic. Fetches by uuid, wraps `PermissionsProvider` and `MetadataProvider`.
