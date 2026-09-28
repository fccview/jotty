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
