# Identity is uuid

A note, a checklist, and a category folder are identified by uuid. Category path and filename slug tell you where the bytes live today. They are not a key. They change when a user renames a title, moves a folder, or picks a different `fileRenameMode`.

Using category+slug as identity is how you open the wrong note after a rename.

## What each field is

`uuid` is identity. Generated with `generateUuid()` on create. Stored in YAML frontmatter. Stable across rename, move, and retitle.

`id` on `Note` and `Checklist` is the on-disk filename without `.md`. The types mark it `@deprecated`. You need it only when you already have the file and must join a path. Never take it from a route, a form, or an API body as "which item".

`category` is a folder path under the owner's directory, default `Uncategorized`. It is user input. Containment-check it. It is not unique. Two users can both have `Work`.

A folder also has its own uuid, kept in `.category-info.json`. Share and mount folders by that uuid (`catUuid`, `catDirByUuid`). The folder name is the display path.

Checklist rows and Kanban cards have `Item.id` inside the parent file. That is a different namespace. The parent list is still reached by the list's uuid. Some REST item routes still use a tree index (`0.1`). That is a published API contract for position inside a list. Leave it. Do not invent a category+slug for the list to match.

## On disk

```
data/notes/<owner>/<category>/<slug>.md
data/checklists/<owner>/<category>/<slug>.md
```

Both are markdown with YAML frontmatter. The uuid lives in that frontmatter. The filename is a sanitised title, made unique with `generateUniqueFilename`. Creating a note called "Hello" does not create `hello.md` as the identity. It creates a new uuid and whatever filename the user's rename mode allows.

Find the file with grep, not by building the path from memory.

```ts
import { grepFindFileByUuid } from "@/app/_utils/grep-utils";

const found = await grepFindFileByUuid(ownerDir, uuid);
// found.filePath, found.id (slug), found.category (folder)
```

`getNoteById(uuid)` and `getListById(uuid)` already do this, including shared mounts. The `ById` names are leftovers. Pass a uuid.

Owner lookup is `getUserByNoteUuid` / `getUserByChecklistUuid`.

## URLs

Canonical:

- `/note/<uuid>`
- `/checklist/<uuid>`
- `/public/note/<uuid>`
- `/public/checklist/<uuid>`
- `/admin/note/<uuid>`
- `/admin/checklist/<uuid>`

Build them with `itemHref` and `publicHref` from `app/_utils/global-utils.ts`. Check a param with `isUuid` from `app/_consts/identity.ts`.

The `[...categoryPath]` pages exist to 301 old links onto the uuid routes. They import `legacy-lookup`. Do not add a third one. Do not link to them.

If a uuid param fails `isUuid`, the page may try `legacyResolve` and redirect. New code should not need that branch.

## API

Path params are named `noteId`, `listId`, `boardId`, `taskId`. They are uuids. Response `id` is the uuid. `howto/API.md` says so, and scripts already store those values.

`listUuid` and the notes `_noteUuid` helper still accept a slug plus `?category=` and log a WARNING. That fallback is going away. New routes take a uuid and 404 otherwise.

## Sharing, indexes, events

Sharing grants, mounts (`categoryUuid`, `itemUuids`), the link index (`.index.json`), comments files, and `broadcast({ entityId })` are all uuid-keyed.

Internal links use `/jotty/<uuid>` and `data-uuid`. When you rewrite a link, write a uuid.

Pinned entries may still contain an old path. `isPinnedEntry` accepts a uuid or a path whose last segment is the uuid. Write uuids for new pins.

## What you may not do

Do not look up an item by `category` + `id` in new code.

Do not put category or slug in a new route.

Do not trust `owner` or `category` from the browser as identity. Resolve the uuid on the server, then see who owns that file.

Do not import `app/_server/actions/lib/legacy-lookup.ts` unless you are the 301 pages or the REST fallback. The file says so at the top.

Do not treat two items with the same title in the same folder as a problem you solve with a smarter slug. They already have different uuids.

## Helpers worth knowing

| Need | Use |
|---|---|
| New uuid | `generateUuid()` in `yaml-metadata-utils` |
| Is this a uuid? | `isUuid()` in `_consts/identity` |
| File from uuid | `grepFindFileByUuid` |
| Note / list from uuid | `getNoteById` / `getListById` |
| Folder uuid | `catUuid` / `catDirByUuid` |
| App link | `itemHref(type, uuid)` |
| Permission on an item | `canReach(uuid, itemType, username, permission)` |
| Disk path after you have the file | `found.filePath`, or `diskPath` which still joins the slug because that is the filename |
