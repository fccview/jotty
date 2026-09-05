# File persistence

There is no database. A missed lock, a half-written file, or a loop that stats 800 notes is a real outage for a real person.

## Layout

```
data/
  users/users.json             accounts. Lock around read-modify-write.
  users/sessions.json          session id → username
  users/session-data.json
  notes/<username>/            markdown notes in category folders
  checklists/<username>/       markdown lists in category folders
  notes/<username>/.index.json link index, keyed by uuid
  <any folder>/.category-info.json   folder uuid, sharing, order
  notifications/<username>.json
  encryption/<username>/       PGP key files, never the passphrase
  logs/
  .schema-version
```

`.sharing.json` and `.order.json` are leftovers. Current code reads them during migration. New writes go to `.category-info.json`.

Schema version is `DATA_SCHEMA_VERSION` in `app/_consts/files.ts`. Old shapes stay readable.

## Files are markdown

Notes and checklists are both `.md` with YAML frontmatter. Checklists are not JSON. `noteToMarkdown` / `listToMarkdown` write them. Readers parse them.

Frontmatter carries `uuid`, `title`, timestamps, tags, encryption flags, checklist type. Body is markdown. Encrypted body is opaque ciphertext. Do not index it.

## Helpers

`app/_server/actions/file/`:

- `ensureDir`
- `readJsonFile` / `writeJsonFile` (atomic temp + rename)
- `serverReadFile` / `serverWriteFile` / `serverDeleteFile`
- `getUserModeDir`

`writeCatInfo` is also atomic. `serverWriteFile` is a straight write. Prefer the atomic helpers for JSON. Do not invent a third writer.

Paths: `path.join(process.cwd(), ...)`. Constants in `app/_consts/files.ts`. Never a relative `"data/..."` you hope is cwd.

## Finding files

Do not walk a user directory once per item. `grep-utils` exists because a naive recursive read fell over.

- One item by uuid: `grepFindFileByUuid`
- Metadata without the body: grep frontmatter helpers, then `getOrCompute` in `metadata-cache.ts`
- List views: `readNotesRecursively` / `readListsRecursively` behind that cache

The cache watches `.md` and `.category-info.json`. If you add a new derived file, teach the watcher.

## Locks and races

Read, change, write back without a lock loses data. It has happened.

- Users file: `patchUserFields` / the locked mutator in `users/records.ts` (`proper-lockfile`)
- Category info: `runQueued` in `lib/concurrency.ts` via `patchCatInfo`
- Note history git: `proper-lockfile` under `data/.locks/`
- In-process single-flight: `singleFlight`, `runQueued`

Take the lock around the whole sequence, starting at the read. A check that returns early and then writes outside the lock is the same bug.

Jotty is one Node process. Those in-process maps are enough until someone clusters it. Do not add Redis.

## Indexes

`.index.json` under notes is the **link** index, keyed by item uuid. Create, update, delete, and move must call `updateIndexForItem` / `removeItemFromIndex`. It does not rebuild itself.

Folder order and sharing live in `.category-info.json` (`order.items` is a uuid list).

If you add a write path and forget the index, search and the graph go stale with nothing in the logs.

## Path containment

Category names end up in file paths. Every join needs `isPathSafe(base, userPath)` or `resolvePath` from `app/_utils/path-utils.ts`.

`targetDir` is the helper that turns a requested category into an owned or mounted directory. Use it. Do not `path.join(userDir, req.category)` in a new action.

Username is not a path segment you trust from the client either. Session username is the actor. Owner comes from the file you resolved.

## Data on this machine

The `data/` directory in a running instance holds real notes. Tests use mocks and temp dirs. `yarn mock:data:notes` / `yarn mock:data:lists` fill a named user for local poking. Do not empty, reshape, or "fix" `data/` to make a test pass.
