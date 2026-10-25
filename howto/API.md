# Jotty API

The REST API reads and writes your notes, checklists, tasks and Kanban boards. Everything except the health check needs an API key, and every request acts as the user who owns that key.

**Every endpoint is documented in the API explorer at the top of How to > API in Jotty.** It lists each one with its parameters, request body and responses, and lets you send real requests from the page. It's built from the code that serves the API, so it always matches the version you're running. Demo instances don't show it.

## Getting an API key

1. Log into Jotty
2. Open your **Profile** by clicking your username in the sidebar
3. Go to the **Settings** tab
4. In the **API Key** section, click **Generate**
5. Copy the key. It starts with `ck_` followed by random characters

Anyone holding the key can do everything you can, so keep it somewhere safe. Generating a new one replaces the old one.

## Using it

Send the key in the `x-api-key` header:

```bash
curl -H "x-api-key: ck_your_api_key_here" https://your-jotty-url.com/api/notes
```

In the explorer, **Use my key** fills in your own key. Requests sent from there run against your real data, so a DELETE deletes for real.

## Ids

Every note, checklist and board has a UUID such as `f47ac10b-58cc-4372-a567-0e02b2c3d479`. Endpoints take the UUID, and every `id` in a response is one.

Checklist and task items are addressed by their tree index inside the list: `0` is the first item, `2.1` is the second child of the third item. Kanban cards use their own item id.

> **Deprecated: slug lookups.** A legacy filename slug still works as the item id, optionally with `?category=` (default "Uncategorized"). Every such request logs a warning, and this fallback **will be removed in a future release**. Switch any stored slugs to UUIDs now.

## Sorting a checklist

| Endpoint | What it does |
|---|---|
| `PUT /api/checklists/{listId}/items/sort` | Reorders the whole list and answers with the sorted checklist. Send `{ "sort": "alphabetical", "direction": "asc" }` for A to Z, `"desc"` for Z to A, `{ "sort": "created" }` or `{ "sort": "modified" }` with `"desc"` for newest first and `"asc"` (the default) for oldest first, or `{ "sort": "shuffle" }` for a new random order every call. Sub-items are sorted under their parent and never move to another one. Needs edit on the list, `403` otherwise, and `404` for a list you can't see. Kanban boards are refused with `400`, move their cards instead |

The new order is saved to the file, so every device and every later request sees it. Item `itemIndex` values change with it, so read the list again before using one. Alphabetical order follows the language set on the account behind the API key, falling back to the instance default, so `ż` sorts after `z` for a Polish account. `created` uses when each item was added and `modified` when it was last changed, falling back to its creation time. Items with no timestamp, usually ones written by hand or by an older version, keep their relative order at the end. A list that is already in the requested order is answered as it is and left untouched on disk.

## Note files

Every note is a markdown file in your data folder, with some YAML frontmatter at the top. If a script writes notes straight to disk, this is the shape Jotty expects:

```markdown
---
uuid: 9f1c2a7e-4b3d-4c8e-9a61-2f5d7e0b8c14
title: Weekly digest
createdAt: 2026-09-28T09:00:00.000Z
tags:
  - home/garden
  - work
managed: true
---
# Weekly digest

What changed this week. #work #home/garden
```

- `uuid` is the note's id, the one the API and every link use. Leave it out and Jotty adds one the first time it reads the file. Don't copy a file with its `uuid` in it. Two files with the same one collide, and only the older one opens until you run `repairDuplicateUuid`.
- `title` is optional. Without it, Jotty uses a `# heading` on the first line, then the filename.
- `createdAt` is optional. Jotty fills it in on the first save. When two files share a `uuid`, the one with the older `createdAt` keeps it.
- `tags` is a copy of the `#hashtags` in the body. Put the hashtags in the body. A tag that only sits in the frontmatter is gone the next time someone saves the note in Jotty. `GET /api/tags` lists your tags, `GET /api/notes?tag=work` filters by one, and `POST /api/notes/{noteId}/tags` adds or removes them without resending the note.
- `managed: true` marks a note your script rewrites. The API returns `"managed": true` on it, and any call that writes into it comes back with a `warning`, because your script will overwrite the change.
- Jotty keeps any other keys you add, untouched.

## Templates

`GET /api/templates` lists your note templates. To start a note from one, pass its `id` as `templateId` to `POST /api/notes` and leave `content` out. Jotty fills `{{title}}` with the new note's title and `{{user}}` with your username, and leaves anything else in double braces alone. Templates are left out of `GET /api/notes`, `GET /api/categories` and search. Template files live in the `.templates` folder of your notes, see How to > Templates.

## Board files

Kanban boards are markdown files too. Each card is one line, with its fields after ` | ` separators:

```markdown
---
uuid: 0f6a3b2c-8d9e-4f10-a1b2-c3d4e5f60718
title: Parser rewrite
checklistType: kanban
specNote: 5b1e8a52-3c1d-4d7e-9f0a-1b2c3d4e5f60
---
- [ ] Build parser | status:in_progress | time:0 | assignee:alice | agent:parser-bot | metadata:{"id":"card-1"}
```

- `specNote` is the uuid of the note pinned as the board's spec. Set it with `PUT /api/kanban/{boardId}/spec` rather than by hand, so Jotty can check you can read the note and that it isn't encrypted.
- `assignee:` is the human assignee, a username.
- `agent:` is a virtual agent, see below. It sits right after `assignee:` and never replaces it.
- `externalId` sits inside `metadata:` and is your own reference for the card, like a GitHub issue URL. Creating a card with an `externalId` the board already has updates that card instead, and `POST /api/kanban/{boardId}/items/batch` does the same for up to 200 cards in one save, so an import can run again without duplicating anything. `PUT /api/kanban/{boardId}/items/{itemId}` sets or changes the `externalId` of a card that already exists, and `GET /api/kanban/{boardId}?externalId=...` returns only the card that has it. That card comes back without the cards it sits under, so it carries a `path` with its tree index, like `2.1`, for the routes that take one.
- Boards without these keep working exactly as before.

## Agents and board specs

A virtual agent is a label on a card for whoever works it, usually an AI or a script driven through the API or the [MCP server](MCP.md). It isn't a user: nobody gets notified, nothing is shared with it, and the card's human assignee stays as it is.

Agent ids are 1-64 lowercase letters, digits, dots, dashes or underscores, like `parser-bot`. Jotty lowercases and trims what you send.

Every board can pin one note as its spec. The spec is an ordinary note holding the plan, with `##` sections Jotty knows by name: Goal, Acceptance criteria, Agents, Tasks, Decisions, References, Progress, Blockers and Handover. The Agents section lists the board's agents and their roles, one per bullet:

```markdown
## Agents
- `parser-bot` - owns the tokenizer
- `ui-bot` - renders the preview

## Tasks
- `card-1` - tokenizer - agent `parser-bot` - depends on `card-0`
```

The card's column stays the source of truth for its status. The spec carries the plan, the decisions and the handover notes.

| Endpoint | What it does |
|---|---|
| `PUT /api/kanban/{boardId}/spec` | Pins a note as the board's spec with `{ "noteId": "<note uuid>" }`, or unpins it with `null`. Needs edit on the board and read on the note. Encrypted notes are refused. Returns the board id, `specNote`, its `status` and the agents it lists |
| `PUT /api/kanban/{boardId}/items/{itemId}/agent` | Sets a card's agent with `{ "agent": "parser-bot" }`, or clears it with `null`. Any valid id works. The answer carries a `warning` when the spec's Agents section doesn't list it or the card's task line names another agent. Needs edit on the board. Answers like the assign endpoint, with the board and the changed `item` |
| `GET /api/kanban/{boardId}/items/{itemId}/context` | Everything needed to work on one card: the card with its subtasks and last 5 status changes, the board's columns with card counts, the card's agent and its other open cards, the dependencies from the spec's task line with their status, and the spec's goal, acceptance criteria, decisions, references, agents and the progress, blockers and handover entries that mention the card or its agent |
| `GET /api/agents/tasks` | Every card and subtask with an agent, across your boards and the boards shared with you. Filter with `agent`, `boardId`, `status` (comma separated status ids) and `includeCompleted=true`, and page with `limit` and `offset` |

On every `/api/kanban/{boardId}/items/{itemId}` route, `itemId` takes the card's full id or the part after the board UUID, so `1759222800417` finds `<board uuid>-1759222800417`. The spec's Tasks section can use either form too.

Spec `status` is `linked`, `none` when the board has no spec, `missing` when the note is gone or you can't read it (the two look the same on purpose), or `encrypted`. An encrypted spec is never opened, so nothing from inside it comes back.

The context answer stays small: whole sections are cut at 2000 characters, the filtered lists keep the last 10 entries of up to 600 characters each, and subtasks and open cards stop at 25. `truncated` is `true` when anything was cut, so read the spec note itself for the rest.

Refusals come back as `400` with one of these messages:

- `Agent id must be 1-64 letters, digits, dots, dashes or underscores with no spaces, starting with a letter or digit. Jotty lowercases it`
- `The board's spec note is missing or you can't read it`
- `Encrypted notes can't be a board spec`

Board and card responses also carry the new fields: `specNote` on boards and `agent` on cards, left out when they aren't set.

## Sharing

You can share your notes and checklists from a script, the same way the share button does. Only the owner or an admin can change who holds an item.

| Endpoint | What it does |
|---|---|
| `GET /api/shares` | What other people shared with you and what you shared. Filter with `direction` (`withMe` or `byMe`), `type`, `item` (a uuid) and `user` (a username) |
| `PUT /api/shares/{itemId}` | Shares the item with `{ "username": "alice", "permission": "rw" }`, or replaces what alice already had. `permission` is `r` to read, `rw` to also edit, `rwd` to also delete, and defaults to `r`. Use `public` as the username for a read-only link anyone can open |
| `DELETE /api/shares/{itemId}/{username}` | Takes that person's access away, or turns the public link off with `public`. Removing somebody who doesn't hold it changes nothing |

Both answer with who holds the item afterwards:

```json
{
  "success": true,
  "data": {
    "id": "9f1c2a7e-4b3d-4c8e-9a61-2f5d7e0b8c14",
    "type": "note",
    "isPublic": false,
    "sharedWith": [
      { "username": "alice", "permissions": { "canRead": true, "canEdit": true, "canDelete": false } }
    ]
  }
}
```

The person you share with gets a notification, and the item shows up in their shared items. Editing a shared item through the API keeps its shares. Sharing a whole folder is still done in Jotty itself.

## Clippers and other apps

Two endpoints help a web clipper or a companion app write notes that look like Jotty's own.

| Endpoint | What it does |
|---|---|
| `POST /api/markdown/from-html` | Turns `{ "html": "...", "baseUrl": "https://..." }` into markdown with the note editor's own schema, so the result is what the editor would save if that HTML had been put in a note. `baseUrl` is optional, and relative links and images are resolved against it. Tables follow the table syntax set on the key owner's account. Nothing is saved, send the markdown to `POST /api/notes` when you want a note. `html` over 5 MB is refused with `400`. HTML that takes longer than 15 seconds or too much memory to convert is refused with `422`, and `503` means enough conversions are already queued that yours should try again shortly. Big tables are the slow part |
| `GET /api/theme` | The key owner's theme as CSS custom properties, built-in and custom themes alike. `mode` is `fixed`, or `system` when the theme follows the device, in which case `variables` is the light palette and `darkVariables` the dark one. `radius` is the corner radius when it isn't the default, and `customCss` says whether the instance has custom CSS at `/api/custom-css`. A theme that was removed falls back to `system` |

```json
{
  "success": true,
  "data": {
    "id": "dracula",
    "name": "Dracula",
    "mode": "fixed",
    "variables": { "--background": "40 42 54", "--primary": "189 147 249" },
    "darkVariables": null,
    "radius": "0.5rem",
    "customCss": false
  }
}
```

Colours are space separated RGB triplets, so use them as `rgb(var(--primary))`.

HTML the editor itself writes converts best. Task lists are `<ul data-type="taskList">` with `<li data-type="taskItem" data-checked="true">` items, and GitHub's checkbox lists are read too. Callouts are `<div data-type="callout" data-callout-type="info">`, with `info`, `warning`, `success` or `danger`. Code blocks take their language from `class="language-js"` on the `<code>`. Mermaid is `<div data-mermaid data-mermaid-content="graph TD; A-->B">` or a `language-mermaid` code block. Keep images out of paragraphs, since an image inside a `<p>` splits it in two.

## Errors

Errors come back as JSON with the status code telling you what went wrong:

```json
{ "error": "Title is required" }
```

Validation errors also carry a `details` array saying which field failed. `401` means the key is missing or wrong, `403` means the key's owner isn't allowed to do that, `404` means the item doesn't exist or isn't visible to them.

## The spec

- `GET /api/openapi.json` returns the OpenAPI 3.1 document to anyone with a valid API key. Scripts, code generators and the [MCP server](MCP.md) use it to find out what your instance supports.
- `GET /api/docs` returns the same document without a key, as JSON or as YAML with `?format=yaml`. It only answers when `ENABLE_API_DOCS=true` is set.

### ReDoc (optional)

To browse the docs outside Jotty, set `ENABLE_API_DOCS=true` on the Jotty service and add ReDoc next to it:

```yaml
api-docs:
  image: redocly/redoc:latest
  container_name: jotty-api-docs
  ports:
    - "40126:80"
  environment:
    SPEC_URL: http://your-jotty-url.com/api/docs
  depends_on:
    - jotty
  profiles:
    - api-docs
```

Start it with `docker compose --profile api-docs up -d` and open `http://localhost:40126`. If it says "Failed to load", check `ENABLE_API_DOCS=true` is set and that `SPEC_URL` points at your instance's `/api/docs`.

## Audit log date ranges

`GET /api/logs` and `POST /api/logs/export` take `startDate` and `endDate` as ISO 8601 dates, such as `2024-05-01` or `2024-05-01T09:30:00Z`. When you leave them out you get the last 30 days. A range longer than 366 days, a start after the end, or a date that isn't a real calendar date gets a `400`.

## Audit log actions

The logs endpoints filter by `action`, a free string. These are the common ones:

| Area | Actions |
|---|---|
| Authentication | `login`, `logout`, `register`, `session_terminated` |
| Users | `user_created`, `user_updated`, `user_deleted`, `profile_updated`, `user_settings_updated` |
| Checklists | `checklist_created`, `checklist_updated`, `checklist_deleted`, `checklist_shared`, `checklist_unshared` |
| Notes | `note_created`, `note_updated`, `note_deleted`, `note_shared`, `note_unshared` |
| Encryption | `note_encrypted`, `note_decrypted`, `encryption_keys_generated`, `encryption_keys_imported` |
| System | `logs_cleaned`, `export_created`, `migration_check`, `file_scan` |
| API | `api_key_generated`, `api_request` |
