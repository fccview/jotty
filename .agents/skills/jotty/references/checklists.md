# Checklists and Kanban

Same storage idea as notes: one markdown file, YAML frontmatter, uuid identity, category folder, slug filename. `listToMarkdown` / parse helpers in `checklist-utils` and `client-parser-utils`.

Kanban is a checklist with `type: "kanban"`. Same files, same uuid, extra fields on items (status, assignee, time entries, reminder). `/kanban` and `/tasks` are views. `isKanbanType` treats leftover `"task"` as kanban on read. Do not write `"task"` on create.

## List identity

`makeList` in `checklist/creator.ts`. `getListById(uuid)`. Mutations take the list uuid, then an `itemId` for the row inside.

`Item.id` is the row's id inside the file. Kanban cards generate those as uuids. Nested checklist rows are a tree. The REST API still addresses some nested rows by index (`0.1`). The list around them is still a uuid.

## Actions

Lists: `app/_server/actions/checklist/`
Rows: `app/_server/actions/checklist-item/`
Kanban extras: `app/_server/actions/kanban/` (status, assign, time, calendar, comments)

Comments file is `COMMENTS_FILE(owner, boardUuid)`. Uuid in the filename.

A row toggle rewrites the whole list file. Reorder writes the whole `items` array. That is the model. Do not try to patch one line on disk.

`canReach(listUuid, ItemTypes.CHECKLIST, username, permission)` before the write. `broadcast({ type: "checklist", entityId: listUuid })` after.

## Hooks

`useChecklist` talks to those actions, then `onUpdate`s local view from the server result. `useKanban` is the board equivalent. Drag and drop is `@dnd-kit`. Do not bring in another DnD library.

## Reminders

Kanban items may carry `reminder: { datetime, notified }`. `app/_server/actions/reminders/scanner.ts` greps `reminder:` under checklists, fires due ones, sets `notified`, notifies, broadcasts `notification`. In-process, once at a time. Self-hosted long-running only.

If you change `datetime`, clear `notified` so it can fire again. Do not double-send.

## Types

`simple` | `task` | `kanban` on `Checklist.type`. Items have `completed`, optional `status`, children, recurrence, archive flags. Look at `app/_types/checklist.ts` before adding a field. A new field is a migration story for files written last year.
