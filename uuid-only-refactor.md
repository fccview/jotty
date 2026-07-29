# UUID-only identification for notes and checklists

## Context

Jotty still identifies notes/checklists by `category + slug` in URLs, server action contracts, hooks, and frontend link building, even though every item already carries a `uuid` in frontmatter/JSON and `getNoteById`/`getListById` already resolve uuid-first via `grepFindFileByUuid`. This refactor makes uuid the ONLY identity across the app layer. Category stays as a feature (folders, move-to, filtering), never as identity. Slug stays only as the on-disk filename, invisible above the file-resolution layer.

## Binding decisions (from fccview)

- Disk layout untouched: `data/<mode>/<user>/<categoryDirs>/<slug>.md|.json`. Grep lookup system stays. No new index.
- Item URLs: singular `/note/<uuid>`, `/checklist/<uuid>`, `/public/note/<uuid>`, `/public/checklist/<uuid>`.
- One legacy redirect catch-all per feature: old `/note/<cat...>/<slug>` resolves to uuid and permanent-redirects. No note content migration (embedded links already use `/jotty/<uuid>`).
- REST API: uuid-only, with ONE category+id fallback that converts to uuid, logs a deprecation warning on every use, is marked `@deprecated`, and is called out in `howto/API.md`.
- No UI changes, no new features.

## Architecture of the change

- **Identity**: `uuid` becomes required on `Note`/`Checklist`. The `id` (slug) field is removed from client-facing types and contracts; it survives only inside the file layer (`GrepFileResult.id`, readers, reminders scanner path parsing), which is filesystem plumbing, not identity.
- **Legacy resolution lives in ONE module**: new `app/_server/actions/lib/legacy-lookup.ts` exporting `legacyResolve(mode, category, id, username?)` returning `{ uuid } | null`. Carries the `@deprecated` JSDoc and logs via `logAudit` (`action: "legacy_lookup"`, WARN) on every call. Only two consumers: the legacy URL redirect routes and the REST API fallback. Nothing else may import it.
- **Uuid-less files**: `getNoteById` already stamps a uuid on load; `getListById` equivalent kept. Sidebar/list hydration (`readNotesRecursively` / checklist readers) reads frontmatter, so every rendered link has a uuid to point at.

## Phase 1 - Server core lookups

Files: `app/_server/actions/note/queries.ts`, `app/_server/actions/checklist/queries.ts`, `app/_server/actions/users/helpers.ts`, new `app/_server/actions/lib/legacy-lookup.ts`.

- `getNoteById(uuid, username?)` and `getListById(uuid, username?, unarchive?)`: drop the `category` param and the direct `category/slug.md` path fallback (that logic moves into `legacy-lookup.ts`). Keep: uuid grep, `.archive` coverage (grep -r already descends into it), shared-items resolution by uuid, uuid stamping for files loaded without one.
- `getUserByNote(id, category)` in users/helpers: only remaining use is legacy; fold into `legacy-lookup.ts`, delete from helpers. `getUserByNoteUuid` / `getUserByChecklistUuid` stay as the primary owner resolution.
- Pinned matching in `getUserNotes` (`pathMatches` on `${category}/${uuid|id}`) switches to plain uuid comparison (see Phase 2 pins).

## Phase 2 - Server actions

Identity param becomes `uuid` everywhere; `category` survives only as DATA (target folder). Remove `id` and `originalCategory` from every formData contract; the current file location is resolved server-side by uuid.

- `note/crud.ts`: `createNote` (keeps `category` as target), `updateNote` (keeps `category` only as move-target; drops `originalCategory`), `deleteNote`, `cloneNote` (keeps target `category`; drops `id`/`originalCategory`), pin/rename/move variants same treatment.
- `checklist/crud.ts`: `createList` (keeps target `category`), `updateList` (drops `id`/`originalCategory`), `deleteList`, `cloneChecklist` same treatment.
- `checklist-item/*` (archive, bulk-operations, crud, drop, reorder, status, sub-items) and `kanban/*` (items, calendar, tempo, time-entries, search): locate the list by `uuid` only; strip `category` from formData reads.
- `sharing/`: `shareWith`/`unshareWith`/`updateItemPermissions` drop `categoryPath`; `checkUserPermission` keys on uuid only; `helpers.getItemUuid` deleted (callers already have uuid); `updates.ts` stops WRITING legacy `id + category` fields into `.sharing.json` (new entries are `{ uuid, ... }`) but readers stay tolerant of old entries that still carry them (match by uuid first, ignore the rest). No sharing-file migration.
- `notifications/index.ts` `_resolveLink`: returns `/note/${uuid}` / `/checklist/${uuid}`.
- `dashboard/index.ts` pins: `user.pinnedLists`/`user.pinnedNotes` store plain uuids going forward. Read-side normalization: when matching/toggling, compare against the last `/`-segment of stored entries so existing `${category}/${uuid}` values keep working and get rewritten to plain uuid on next toggle/reorder. No users.json migration.
- WebSocket: every `broadcast()` caller sends `entityId: uuid` (audit note/checklist/checklist-item/kanban mutation paths for `list.id`/`listId` leaks).
- `reminders/scanner.ts`: path-derived owner/category parsing is file-layer and stays; notification payload `itemId` must be `list.uuid` only (drop the `|| list.id` fallback after ensuring the scanner stamps/skips uuid-less lists the same way readers do).
- `export`, `history`, `search`, `stats`, `archived`: same mechanical sweep, uuid in, category only as displayed metadata.

## Phase 3 - Routing

- `app/(loggedInRoutes)/note/[...categoryPath]/` becomes `app/(loggedInRoutes)/note/[uuid]/page.tsx`; same for `checklist`, `public/note`, `public/checklist`. Pages call `getNoteById(uuid, ...)` directly; `generateMetadata` resolves title via the same uuid lookup (adjust `getMedatadaTitle` signature to uuid-only).
- Legacy redirects: keep a sibling catch-all `[...legacyPath]/page.tsx` in each of the four folders whose ONLY content is: parse `<cat...>/<slug>`, call `legacyResolve`, `permanentRedirect("/note/<uuid>")`, else `redirect("/")`. Next.js matches the single dynamic segment `[uuid]` before the catch-all for one-segment URLs; for a one-segment LEGACY slug (Uncategorized item), the `[uuid]` page checks a uuid regex (export a shared `UUID_REGEX` const, it is currently duplicated in both queries.ts files) and falls through to `legacyResolve` + redirect. Verify the sibling `[uuid]` + `[...legacyPath]` coexistence in dev first; if Next 16 rejects it, fold both into a single catch-all page that branches on segment count + uuid regex.
- Delete `decodeId`/`encodeId` usage from pages.

## Phase 4 - Frontend

- `app/_utils/global-utils.ts`: delete `buildCategoryPath`, `encodeId`, `decodeId`. Add `itemHref(type: ItemTypes, uuid: string)` returning `/note/${uuid}` etc. (enum-driven, no magic strings). Keep `encodeCategoryPath`/`decodeCategoryPath` ONLY if still needed by category-feature UI (sidebar folder expansion in `sidebar-store.ts` uses raw category strings, not URLs; if nothing else uses them after the sweep, delete them too).
- Sweep every URL builder to `itemHref`: `SidebarItem`, `SharedItemsList`, `CategoryList` (post-move navigation), `NotesPageClient`, `ChecklistsPageClient`, `TasksPageClient`, `KanbanPageClient`, `HomeClient`, `TagsHome`, `TagHoverCard`, `SwipeNavigationWrapper`, `NoteEditorHeader`, `ChecklistClient`, `ChecklistHeader`, `LastModifiedCreatedInfo` (public/copy links), `graph-data.ts`, `ReferencedBySection`, `AdminContent`, `Layout`.
- Modals (`CreateNoteModal`, `EditNoteModal`, `CreateListModal`, `EditChecklistModal`): send `uuid` + target `category` only; drop `id`/`originalCategory` appends; navigate to `itemHref(...)` after mutation.
- Hooks: `useNoteEditor`, `useChecklist`, `useSidebar`, `ShortcutsProvider`: uuid-only action calls and navigation.
- Internal links: `InternalLinkComponent`, `UnifiedMarkdownRenderer`, `markdown-utils.tsx`: `/jotty/<uuid>` hrefs navigate straight to `itemHref` (no more client-side category/id conversion). Legacy `/note/<cat>/<id>` hrefs inside old content keep working via the Phase 3 redirect route, so the parsers only need to stop GENERATING category-based hrefs.
- Kanban components (`Kanban`, `KanbanCard`, `KanbanCardDetail`, `KanbanColumn`, `TimeEntriesModal`): stop threading `category` through item/status/time-entry action calls.

## Feature-by-feature audit (verified against code)

- **Sidebar**: `useSidebar.tsx` uses `buildCategoryPath` only to compute `expectedPath` for active-item highlighting (line ~171); becomes a uuid comparison against pathname `/note/<uuid>`. Category select/expand/filter (`sidebar-store.ts` `expandCategoryPath`, `selectedFilter {type:'category'}`) is category-as-feature and is UNTOUCHED. `SidebarItem` `itemHref`, `SharedItemsList` links, `CategoryList` post-drag/move navigation switch to uuid URLs; the move action itself keeps target category as data.
- **Sharing**: `.sharing.json` entries already carry uuid; `useSharingTools.ts` matches entries by `uuid || (id && category)` and appends `category` to share formData. It goes uuid-only for matching and stops sending category; server keeps read tolerance for old entries (Phase 2). Public link generation lives in `useSharingTools.ts` (2 sites building `public/note|checklist` URLs) and `useNoteEditor.tsx` print URL (`/public/note/<categoryPath><encodeId(...)>`), all switch to `/public/<type>/<uuid>`.
- **Bilateral linking**: the link index (`_server/actions/link/index.ts`, `_types/links.ts`) is ALREADY fully uuid-keyed (`isLinkedTo`/`isReferencedIn` by uuid, maintained via `updateIndexForItem`/`removeItemFromIndex`/`rebuildLinkIndex` from note/checklist crud and category move). No structural change. `updateItemCategory` in link/index.ts has zero callers: delete as dead code. `ReferencedBySection` builds `/${type}/${encodeCategoryPath(item.path)}` URLs from category/id: switches to `itemHref(type, uuid)` (the index already gives uuids).
- **Tags**: tags index (`_types/tags.ts`) is ALREADY uuid-keyed (`noteUuids`, `checklistUuids`). Only URL builders change: `TagHoverCard.tsx` (buildCategoryPath links) and `TagsHome.tsx` (categoryPath router.push) go to `itemHref`. Tag filtering stays as-is.
- **Internal links**: content already stores `/jotty/<uuid>`; parsers (`link/index.ts parseInternalLinks`, `markdown-utils.tsx`, `UnifiedMarkdownRenderer.tsx`, `InternalLinkComponent.tsx`) keep reading that format and simply navigate to `itemHref` instead of resolving to category/id URLs client-side.

## Phase 5 - REST API

Files: `app/api/notes/[noteId]/route.ts`, `app/api/checklists/[listId]/**`, `app/api/tasks/[taskId]/**`, `app/api/kanban/[boardId]/**`.

- Param must be a uuid. If it fails `UUID_REGEX`: call `legacyResolve(mode, category ?? "Uncategorized", param)` (category from `?category=` query), log the deprecation warning (comes free with `legacyResolve`), then continue with the resolved uuid. `@deprecated` JSDoc sits on `legacyResolve` and on the small `_uuidOrLegacy` helper each route shares (put it next to `withApiAuth` or in `legacy-lookup.ts`).
- Responses: `id` field returns the uuid (it already returns `uuid || id`; make it uuid, drop slug exposure). `category` stays in responses as metadata; category-based FILTERING (`?category=`) on list endpoints stays, it is feature not identity.
- `howto/API.md`: identifiers are uuids; add a deprecation note for slug/category lookups with removal warning.

## Phase 6 - Types and dead-code cleanup

- `app/_types/note.ts`: `Note.uuid: string` (required), remove `Note.id`. Same for `Checklist`/`List` in `checklist.ts`. Components keying on `item.id` switch to `item.uuid`.
- `app/_types/sharing.ts` + `_server/actions/sharing/types.ts`: uuid required on new-entry types; keep optional legacy fields on the READ shape only, marked `@deprecated`.
- Final gate: `grep -rn "buildCategoryPath\|originalCategory\|categoryPath\|decodeId\|encodeId" app/` returns hits ONLY in `legacy-lookup.ts` and the four legacy redirect pages. `grep -rn "\.id\b" on Note/Checklist` consumers manually swept.

## Phase 7 - Tests and docs

- `tests/mock-data/*generator.ts`: unchanged disk layout (category dirs + slug filenames) but every generated file must include uuid frontmatter (already mostly true); expose uuids for fixtures.
- Update: `tests/server-actions/{note,checklist-item,dashboard,history,sharing}.test.ts`, `tests/api/{notes,checklists,items,tasks,error-handling,user-summary}.test.ts`, `tests/security/auth-required.test.ts`, `tests/utils/connections-graph-data.test.ts`: actions/routes called with uuid, no category identity assertions; add coverage for the legacy redirect resolution and the API fallback deprecation log.
- Run focused suites per phase (`yarn test tests/server-actions/note.test.ts` style), full `yarn test:run` + `yarn lint` at the end. NO build.

## Execution order

Phases 1-2 (server) first, keeping old formData reads temporarily tolerant is NOT needed since frontend and server ship together; do it as one branch, but commit per phase. Phase 3 routing next, Phase 4 frontend sweep, Phase 5 API, Phase 6 types (this forces the compiler to find every missed `id`/`category` identity use), Phase 7 tests continuously plus final sweep.

## Verification

- Full `yarn test:run` and `yarn lint` green (focused suites per phase along the way). No build, no yarn dev (fccview handles manual runtime checks).
- Final grep gate as per Phase 6.
- Manual checklist for fccview: sidebar navigation (URL is `/note/<uuid>`), create/edit/move/clone/delete for both types, kanban, share + public link, pin/unpin, notification link, `/jotty/<uuid>` internal link, legacy `/note/<category>/<slug>` URL redirect (incl. one-segment slug), API uuid lookup + legacy `?category=` fallback producing the WARN log entry, uuid-less dropped-in `.md` getting stamped on first open.

## Risks / watch items

- `[uuid]` + `[...legacyPath]` sibling route coexistence in Next 16: verify first thing in Phase 3; fallback design included above.
- Mixed-format pinned entries in existing `users.json` (handled by last-segment matching).
- WebSocket consumers that currently match on slug entityId will silently stop matching if one caller is missed; sweep all `broadcast(` call sites.
- Encrypted notes and `.archive/` items: uuid grep must keep finding them (it does, grep -r); test both.
- External API consumers break on slug ids in responses; deprecation note in API.md is the agreed mitigation.

## After approval

Copy this file into the repo at `.claude/plans/uuid-only-refactor.md` (per fccview's instruction) before starting implementation.

## Progress

### Phase 1 - COMPLETE
- Added app/_consts/identity.ts (UUID_REGEX, isUuid) and UNCATEGORIZED const in app/_consts/notes.ts.
- Created app/_server/actions/lib/legacy-lookup.ts (legacyResolve, deprecated, logs WARNING via logAudit on every use, stamps uuid on uuid-less legacy files).
- getNoteById(uuid, username?) and getListById(uuid, username?): category param and category/slug path fallbacks removed; uuid grep + uuid-matched shared items only.
- sharing/permissions.ts rewritten uuid-only: isItemSharedWith/getItemPermissions/canUser*Item/checkUserPermission(uuid, itemType, username, permission); own-file check via grepCheckUuidExists.
- sharing/updates.ts: updateSharingData now uuid-keyed; only deletion and sharer transfer remain, rename/move maintenance deleted.
- note+checklist readers now stamp uuid on uuid-less files during metadataOnly/excerpt/raw listing (sidebar always has a uuid to link to).
- Pinned matching (pathMatches) in getUserNotes/getUserChecklists compares plain uuid or last path segment of stored pins.

### Phase 2 - COMPLETE (semantic verification done, 2026-07-11)
- notifications/index.ts `_resolveLink` returns `/note/${uuid}` and `/checklist/${uuid}` via uuid lookups.
- dashboard/index.ts pins: togglePin/updatePinnedOrder store bare uuids; `_pinMatches` compares plain uuid or last `/`-segment for legacy `${category}/${uuid}` entries; toggleArchive sends uuid-only formData with category as move target.
- reminders/scanner.ts: skips uuid-less lists with a log, notification payload `itemId: list.uuid`, broadcast `entityId: updatedList.uuid`. Path-derived owner/category parsing stays as file-layer.
- WebSocket entityIds: repo-wide grep shows every non-uuid `entityId` is in category/crud.ts (category names, category-as-feature, correct); all note/checklist/item/kanban/sharing broadcasts send uuid.
- sharing: share-operations.ts writes new entries as `{ uuid, sharer, permissions }` only; updates.ts and entry matching key on uuid exclusively; types.ts keeps `id`/`category` as optional `@deprecated` read-tolerant fields.
- history/export/search/stats/archived: no legacy formData identity, no originalCategory/categoryPath/encodeId/decodeId. Remaining `note.id`/`list.id` uses are file-layer only (history git path reconstruction, export filenames, archived display metadata).
- Bug found and fixed during verification: useSearch.ts dropped `uuid` when mapping server search results while `handleSelectResult` required `result.uuid`, so clicking any search result was a no-op. `uuid` now carried through the local SearchResult shape (useSearch.ts, SearchResults.tsx; result keys prefer uuid).

### Phase 2 sweep notes (pre-verification)
- note/crud.ts and checklist/crud.ts converted to uuid contracts: update/delete/clone read uuid only, category kept only as move/clone target, revalidatePath uses /note/<uuid> and /checklist/<uuid>, clone re-fetches by generated uuid, updateSharingData calls simplified.
- checklist-item/archive.ts, bulk-operations.ts, crud.ts, reorder.ts, status.ts, and sub-items.ts have been swept so checklist identity is uuid, not listId/category identity.
- checklist/converters.ts has been swept so conversion identity is uuid, not listId/category identity.
- kanban/calendar.ts, items.ts, search.ts, tempo.ts, and time-entries.ts have been swept so board/list identity is uuid.
- Current grep check shows no remaining `formData.get("listId")`, `formData.get("category")`, `originalCategory`, `categoryPath`, old encode/decode URL helpers, or `entityId: listId/list.id/id` hits inside the Phase 2 server areas checked: checklist-item, checklist/converters, kanban, dashboard, history, notifications, reminders, and sharing.

### Phase 4 - COMPLETE (grep gate + lint green, 2026-07-11)
- Frontend legacy URL-builder sweep done: ShortcutsProvider, NoteClient, ChecklistClient, InternalLinkComponent, UnifiedMarkdownRenderer, markdown-utils, AdminContent, TagsHome, HomeClient, EditNoteModal, EditChecklistModal, NoteEditorHeader, graph-data, SidebarItem, SwipeNavigationWrapper, useAdjacentNotes. global-utils exposes itemHref/publicHref; buildCategoryPath/encodeId/decodeId deleted.
- Checklist/kanban hooks and components verified/converted: useChecklist, useKanban, useKanbanItem, useKanbanDnd, Kanban, KanbanCard, KanbanCardDetail, KanbanColumn, KanbanPageClient, TimeEntriesModal all send uuid identity; itemId appends in these files are checklist ITEM ids (item-level, not list identity) and stay.
- ChecklistsPageClient, TasksPageClient, NotesPageClient, useChecklistHome converted (uuid pins, itemHref navigation).
- useNotesHome converted (parallel to useChecklistHome): bare-uuid pin order, uuid-only togglePin/updatePinnedOrder, uuid pinned matching with last-segment tolerance.
- useNoteEditor confirmDelete now sends uuid only (was appending id + category; deleteNote server action reads uuid only).
- useSharingTools rewritten uuid-only: calls now match the Phase 2 uuid-only shareWith/unshareWith/updateItemPermissions signatures (previous calls were argument-misaligned against the new server contracts, a live bug: category was landing in the sharerUsername slot), entry matching is entry.uuid only, public URLs via publicHref, dead formData block removed, itemId/itemCategory props dropped; ShareModal updated to match.
- getReferences dead itemCategory param removed; callers (Kanban, ChecklistBody, NoteEditorContent) updated; dead noteCategory prop removed from NoteEditorContent/NoteEditor.
- Remaining category appends in frontend are target/display data only (clone target, create target, updateNote keep-category, quick-create default) per plan.
- Grep gate clean: no append("listId"/"id"/"originalCategory"), no buildCategoryPath/encodeId/decodeId, no entry.id+category sharing matches in app/_components, _hooks, _providers, _utils. Leftover `uuid || id` hits are React keys/dnd ids and api-transforms.ts (Phase 5/6 cleanup, not action identity).
- git diff --check clean; yarn lint green. No build run.

### Phase 3 - COMPLETE (statically verified, 2026-07-11; runtime route-precedence check left for manual dev run)
- All four features have sibling `[uuid]/page.tsx` + `[...categoryPath]/page.tsx` routes: `(loggedInRoutes)/note`, `(loggedInRoutes)/checklist`, `public/note`, `public/checklist` (plus admin `[uuid]` routes).
- `[uuid]` pages: `isUuid` guard, non-uuid single segment falls through to `legacyResolve(mode, UNCATEGORIZED, param)` + `permanentRedirect`, else `redirect("/")`; content fetched via `getNoteById(uuid, ...)`/`getListById(uuid, ...)`; `generateMetadata` uses `getMedatadaTitle(mode, uuid)`.
- Catch-all pages contain only: parse `<cat...>/<slug>`, `legacyResolve`, `permanentRedirect` to the uuid URL, else `redirect("/")`.
- `legacy-lookup.ts` covers `.archive` and Uncategorized root candidates, stamps uuid on uuid-less legacy files, and logs a WARNING deprecation audit entry on every successful resolve. Checklists are `.md` on disk so the `${id}.md` candidates are correct for both modes.
- `encodeId`/`decodeId`: zero references left in app/. `legacy-lookup` importers are exactly the 8 redirect/uuid pages + 2 API routes (Phase 5).
- NOT verifiable without dev/build: Next 16 accepting `[uuid]` + `[...categoryPath]` as siblings at runtime and matching precedence (single dynamic segment before catch-all). Standard Next behavior, but needs the manual dev-run check fccview planned.

### Phase 5 - COMPLETE (verified 2026-07-11 evening session)
- Single API fallback lives in legacy-lookup.ts as `resolveApiId` (uuid passthrough via isUuid, else legacyResolve with `?category=` defaulting to Uncategorized, WARN audit log on every legacy hit, `@deprecated` JSDoc). Shared per-route helper is `listUuid` in api-utils.ts.
- Every item-identity dynamic route uses it: checklists/[listId]/** (route, items, itemIndex, check, uncheck, reorder), tasks/[taskId]/** (route, items, itemIndex, status, statuses, statusId), kanban/[boardId]/** (route, items, itemId, assign, reminder, status, statuses, calendar), notes/[noteId]. Remaining dynamic routes without it are file/media/user routes (exports, image, file, video, avatar, app-icons, serwist, diagram-proxy), which have no item identity.
- Responses: no `uuid || id` fallback left anywhere under app/api or api-transforms.ts; `id` fields return uuids. Category filtering (`?category=`) and category response metadata retained as feature.
- howto/API.md: deprecation block added to the Identification section (slug/category lookup still resolves, logs a warning, will be removed; all response ids are uuids).

### Phase 6 - COMPLETE (grep gates + lint green, 2026-07-11 evening session)
- Types: `Note.uuid` and `Checklist.uuid` required; `id` KEPT on both as a `@deprecated` file-layer slug field (readers construct objects from filenames and history/export/archived still need the slug for paths). This deviates from the original "remove Note.id" wording deliberately: the field is documented as never-identity, and no app-layer code uses it as identity anymore.
- Sharing types: `uuid` on entry shapes, legacy `id`/`category` optional and `@deprecated` on the read-tolerant shape only.
- Dead legacy owner-resolution chain deleted: `getUserByNote`, `getUserByChecklist`, `getUserByItem`, `findFileRecursively` removed from users/queries.ts, users/helpers.ts, and users/index.ts exports (zero callers; `getUserByNoteUuid`/`getUserByChecklistUuid` are the owners now).
- Last `uuid || id` identity fallbacks removed: pin pathMatches in note/checklist queries.ts, note/checklist delete broadcasts (entityId now uuid only), ChecklistHeader copy-id tooltip, NoteCard dnd sortable id.
- Grep gates: `buildCategoryPath|originalCategory|decodeId|encodeId` returns ZERO hits in app/ (helpers fully deleted). `formData.get("id"/"listId")` and `append("listId"/"originalCategory")` return zero hits. Remaining `categoryPath` hits are category-feature UI (sidebar, category modals/dropdowns), file-layer readers/category-utils, encode/decodeCategoryPath in global-utils, and the four legacy redirect pages, all allowed by the plan.
- Intentional leftovers (not identity): SearchResults key uses `result.uuid || result.id` because search reads raw grep results where frontmatter may lack a uuid (selection itself requires uuid and no-ops otherwise); decodeCategoryPath in InternalLinkComponent/UnifiedMarkdownRenderer/markdown-utils is read-tolerance for legacy hrefs inside OLD note content (display only, generation is uuid-only); sharing-migration.ts keeps encodeCategoryPath for legacy data migration.

### Still left
- Phase 7 tests/docs: update test suites for uuid contracts, add coverage for legacy redirect resolution and the API fallback deprecation log, full `yarn test:run` + `yarn lint` at the end. NOT started, intentionally left per session scope.
- Manual runtime checks (fccview, needs dev server, no builds run by AI): Next 16 accepting `[uuid]` + `[...categoryPath]` sibling routes and matching precedence; the manual checklist in the Verification section above.
- Everything is uncommitted on feature/uuid-refactor; commits are fccview's call.
