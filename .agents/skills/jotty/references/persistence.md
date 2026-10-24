# File persistence

Your files are the database. The only other store is a derived SQLite index of relationships, which can always be rebuilt from them. A missed lock, a half-written file, or a loop that stats 800 notes is a real outage for a real person.

## Layout

```
data/
  users/users.json             accounts. Lock around read-modify-write.
  users/sessions.json          session id → username
  users/session-data.json
  notes/<username>/            markdown notes in category folders
  checklists/<username>/       markdown lists in category folders
  <any folder>/.category-info.json   folder uuid, sharing, order
  notifications/<username>.json
  encryption/<username>/       PGP key files, never the passphrase
  logs/
  .schema-version
  .relations.db                derived links index (SQLite, WAL). Disposable.
```

`.sharing.json` and `.order.json` are leftovers. Current code reads them during migration. New writes go to `.category-info.json`.

Schema version is `DATA_SCHEMA_VERSION` in `app/_consts/files.ts`. Old shapes stay readable.

## Files are markdown

Notes and checklists are both `.md` with YAML frontmatter. Checklists are not JSON. `noteToMarkdown` / `listToMarkdown` write them. Readers parse them.

Frontmatter carries `uuid`, `title`, `createdAt`, tags, encryption flags, checklist type. Body is markdown. Encrypted body is opaque ciphertext. Do not index it.

## Helpers

`app/_server/actions/file/`:

- `ensureDir`
- `readJsonFile` / `writeJsonFile` (atomic temp + rename)
- `serverReadFile` / `serverWriteFile` / `serverDeleteFile` / `serverDeleteDir` / `serverRenamePath`
- `getUserModeDir`
- `stampUuid` in `lib/stamp-uuid.ts` for giving an item file its uuid

`serverWriteFile` is atomic (temp file + rename), stamps `createdAt` on item files that lack it, invalidates the metadata cache and updates the relations index. Delete, rename and move go through the helpers above for the same reasons. A raw `fs.writeFile` or `fs.rename` on an item file skips all of that. Do not invent another writer.

Paths: `path.join(process.cwd(), ...)`. Constants in `app/_consts/files.ts`. Never a relative `"data/..."` you hope is cwd.

## Finding files

Do not walk a user directory once per item, and do not spawn a process per file. One `sed` per note is what took a 10k note library down.

- One item by uuid: `grepFindFileByUuid`. It asks the relations index first and checks the answer against the file on disk before trusting it.
- Frontmatter without the body: `frontmatterOf` / `fillFrontmatters` in `lib/frontmatter-memo.ts`. In-process head reads, memoised on mtime and size, capped by `gated()`.
- List views: `readNotesRecursively` / `readListsRecursively` behind `getOrCompute` in `metadata-cache.ts`. One file's entry: `readNoteEntry` / `readListEntry`.
- Pages of a list: `browse/page.ts`. The REST notes list (`note/api-listing.ts`) filters summaries and reads bodies only for the page it returns. Bodies for a page: `note/bodies.ts`. Strip `sourcePath` before anything leaves the server.

The cache watches `.md` and `.category-info.json`. A changed `.md` marks that file dirty, and the next read patches the cached value through its refresh function (`listingPatcher` in `lib/listing-patch.ts` for listings) instead of rebuilding it. Anything else, or a refresh that returns null, rebuilds. A cache registered without a refresh rebuilds in full after every save, which on a big library is seconds. Give it one, and test that the patched result equals a fresh read. If you add a new derived file, teach the watcher.

`fs.watch` stays silent on some network mounts and bind mounts. The REST API can't answer from a cache it can't trust, so `getUserNotes({ verify: true })` stats the folder against the memo first (`lib/listing-verify.ts`) and patches whatever changed behind the watcher's back. Use it for anything a script reads.

Module-level caches and memos live on `globalThis`. Dev compiles a bundle per route, and a plain module variable becomes several caches that disagree.

## Locks and races

Read, change, write back without a lock loses data. It has happened.

- Any file lock: `withFileLock` in `lib/file-lock.ts`. It queues callers in memory before taking the `proper-lockfile` lock and logs a compromised lock instead of throwing. Don't call `lock()` directly, and never nest `withFileLock` on the same path: it waits on itself.
- Users file: `patchUserFields` / `mutateUsers` in `users/records.ts`
- Sessions: `mutateSessions` in `session/store.ts`
- Category info: `runQueued` in `lib/concurrency.ts` via `patchCatInfo`
- Note history git: `proper-lockfile` under `data/.locks/`
- In-process single-flight: `singleFlight`, `runQueued`
- Capping open files or parallel reads: `gated(limit)`

Take the lock around the whole sequence, starting at the read. A check that returns early and then writes outside the lock is the same bug.

Jotty is one Node process. Those in-process maps are enough until someone clusters it. Do not add Redis.

## Indexes

`data/.relations.db` is the **relations** index, in `app/_server/actions/relations/`. It holds items, links between them, frontmatter aliases and plain note text for "Mentioned in". It is derived and disposable: a missing, corrupt or old-schema file is discarded and rebuilt from the markdown, with the UI showing "Indexing relationships...". Deleting or replacing it while the app runs is noticed by inode on the next read. Bump `RELATIONS_SCHEMA_VERSION` when its shape changes. No migration, it just rebuilds.

- Bulk work (rebuild, reconcile, owner and moved-tree sweeps) runs in a worker thread through `relations/night-shift.ts`, so pages keep answering while it runs. `indexer.ts` holds per-item primitives, `sweep.ts` the bulk jobs. Call bulk work through `night-shift`. It runs inline in tests or when the worker can't start.
- Only the main thread creates the db. A worker that finds it gone throws `RelationsGoneError` and the main thread rebuilds. Two threads creating it split the index across two files.
- `texts` rows are keyed by the item's rowid. Deleting them by uuid made a rebuild quadratic.

- Writes keep it current through the file helpers (`trackItemWrite` and friends in `relations/tracking.ts`). Use the helpers and you get it for free.
- Changes made outside Jotty are caught by a recursive `fs.watch` on the notes and checklists roots, throttled to one pass a minute, which only stats the paths that changed. If the watcher can't start, reads fall back to a full mtime reconcile at most once a minute.
- Encrypted notes are indexed by uuid and title only. Their body is never parsed.
- Wikilinks resolve from the files alone (`relations/resolve.ts`). The order is title, filename, folder path, then frontmatter aliases, and the path breaks ties. Incremental indexing and a full rebuild must give the same answer. Never store a resolution choice the files can't reproduce.
- Renaming or moving an item rewrites the `[[...]]` text in the notes and checklists that link to it (`relations/relink.ts`). Each rewrite runs in the source's own item lane, after the renamed item's write finishes. The rewritten file keeps the link on the item. The index doesn't.
- An item with no stored uuid in a writable folder, whose frontmatter `stampUuid` refuses to touch, is locked (`lib/unstamped.ts`). `canReach` and `reachableFile` refuse EDIT and CREATE on it, and pins, shares, links and spec pins check `isLockedUuid` themselves. Its path id must never get recorded anywhere. `fixFrontmatter` is the only write it accepts.
- Queries are permission scoped through `visibleItems(username)`. Never return rows the viewer can't see.

Folder order and sharing live in `.category-info.json` (`order.items` is a uuid list).

## Path containment

Category names end up in file paths. Every join needs `isPathSafe(base, userPath)` or `resolvePath` from `app/_utils/path-utils.ts`.

`targetDir` is the helper that turns a requested category into an owned or mounted directory. Use it. Do not `path.join(userDir, req.category)` in a new action.

Username is not a path segment you trust from the client either. Session username is the actor. Owner comes from the file you resolved.

## Data on this machine

The `data/` directory in a running instance holds real notes. Tests use mocks and temp dirs. `yarn mock:data:notes` / `yarn mock:data:lists` fill a named user for local poking. `yarn mock:data:brain --user=<name>` writes a linked set under a `Brain Seed` category, and `--remove` deletes only that category. Do not empty, reshape, or "fix" `data/` to make a test pass.
