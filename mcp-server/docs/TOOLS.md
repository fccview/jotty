# MCP tools

Every tool the Jotty MCP server offers, what it does and what it takes. Using boards to coordinate a team of AI agents is in the `agents` guide, which `mcp_docs` returns.

Each tool is named after its API operation in snake case, so `listNotes` becomes `list_notes`. The server reads the list from your instance, so a tool your Jotty version doesn't have yet won't show up, and `discover` lists it under `unavailableTools`.

---

## Before you start

- Notes, checklists and boards go by UUID. List or search first to get one.
- Checklist items take their `itemIndex`, like `0` or `2.1`. `get_checklist` returns it for every item.
- Kanban cards take their card id as `itemId`. `get_board` returns it for every card. The part after the board's UUID works on its own, so `1759222800417` finds `c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800417`.
- Every tool also takes `maxChars`, the most characters it sends back for that call. Lower it to save room, raise it to read a large result whole.
- When something fails, the tool says why and what to try next. It refuses arguments the operation doesn't take and lists the ones it does.

The examples show the arguments you pass to each tool. The ids in them are made up, so swap in your own:

| Example id | What it is |
|---|---|
| `5e0c8b14-2f7a-4d93-8b61-c3a9e7d2f016` | A note called "Groceries" |
| `3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7` | A spec note called "Spec: Parser rewrite" |
| `9a7f3e21-6c4b-4e08-b2d5-18f0c7a3e964` | A checklist called "Weekend" |
| `c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50` | A Kanban board called "Parser rewrite" |
| `c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800417` | A card on that board |
| `parser-bot` | An agent id, usually listed in the spec note |

---

## Finding things

| Tool | What it does | Arguments |
|---|---|---|
| `search` | Full-text search across your own notes and checklists. The best matches come first, words in any order | `q` (2 characters or more), `type` (`note` or `checklist`), `match` (`smart`, `ranked` or `substring`) |
| `list_categories` | Your note and checklist folders, shared ones included | none |
| `get_summary` | How many notes, checklists, items and tasks a user owns | `username` (admins only, yours when left out) |
| `get_current_user` | The API key owner's profile and preferences | none |

```json
{ "q": "parser grammar", "type": "note" }
```

---

## Notes

| Tool | What it does | Arguments |
|---|---|---|
| `list_notes` | Notes you can read, 25 at a time in a summary view with an excerpt each | `category`, `q`, `tag`, `view` (`summary` or `full`), `limit`, `offset` |
| `get_note` | One note with its content and `contentLength` | `noteId`, `offset`, `limit` (characters) |
| `get_notes` | Up to 50 notes by UUID in one call, with the ones it couldn't find under `missing` | `ids` (comma separated) |
| `create_note` | Makes a note | `title`, `content`, `category` |
| `update_note` | Replaces a note's title, folder or whole content | `noteId`, `title`, `content`, `category` |
| `patch_note` | Swaps one exact piece of text for another and leaves the rest byte for byte | `noteId`, `find`, `replace` |
| `tag_note` | Adds or removes `#tags` without resending the note | `noteId`, `add`, `remove` |
| `list_tags` | Every tag you use and how many items carry it | none |
| `delete_note` | Deletes a note | `noteId` |

`patch_note` refuses when `find` isn't in the note or appears more than once, so pick a piece of text that is unique. The end of the note counts as a line end, so `## Handover\n` matches a note that ends with that heading. `update_note` replaces everything, so only send it after reading the whole note.

```json
{ "tag": "work", "view": "summary", "limit": 10 }
```

```json
{ "noteId": "5e0c8b14-2f7a-4d93-8b61-c3a9e7d2f016", "offset": 0, "limit": 4000 }
```

```json
{ "ids": "5e0c8b14-2f7a-4d93-8b61-c3a9e7d2f016,3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7" }
```

```json
{ "title": "Groceries", "content": "- milk\n- bread\n\n#home", "category": "Home" }
```

```json
{ "noteId": "5e0c8b14-2f7a-4d93-8b61-c3a9e7d2f016", "find": "- bread", "replace": "- bread\n- eggs" }
```

```json
{ "noteId": "5e0c8b14-2f7a-4d93-8b61-c3a9e7d2f016", "add": ["home/kitchen"], "remove": ["home"] }
```

If a script rewrites one of your notes, add `managed: true` to its frontmatter. `jotty_docs` with `api` has an example file. Tools then flag the note as managed, and any tool that writes into it warns that the script will overwrite the change.

---

## Checklists

| Tool | What it does | Arguments |
|---|---|---|
| `list_checklists` | Your checklists and the ones shared with you, 25 at a time in a summary view | `category`, `type` (`simple` or `kanban`), `q`, `view`, `limit`, `offset` |
| `get_checklist` | One checklist with every item and its `itemIndex` | `listId` |
| `create_checklist` | Makes a checklist | `title`, `category`, `type` |
| `update_checklist` | Renames or moves a checklist | `listId`, `title`, `category` |
| `delete_checklist` | Deletes a checklist | `listId` |
| `create_checklist_item` | Adds an item, or a sub-item under `parentIndex` | `listId`, `text`, `parentIndex` |
| `update_checklist_item` | Changes an item's text or details | `listId`, `itemIndex`, `text`, `description`, `priority`, `score`, `startDate`, `targetDate`, `estimatedTime` |
| `delete_checklist_item` | Removes an item and its sub-items | `listId`, `itemIndex` |
| `check_checklist_item` | Ticks an item and its sub-items | `listId`, `itemIndex` |
| `uncheck_checklist_item` | Unticks an item and its sub-items | `listId`, `itemIndex` |

```json
{ "listId": "9a7f3e21-6c4b-4e08-b2d5-18f0c7a3e964", "text": "Buy charcoal", "parentIndex": "2" }
```

```json
{ "listId": "9a7f3e21-6c4b-4e08-b2d5-18f0c7a3e964", "itemIndex": "2.1" }
```

---

## Kanban boards

| Tool | What it does | Arguments |
|---|---|---|
| `list_boards` | Your boards, 25 at a time with card counts per column | `category`, `status`, `q`, `view`, `limit`, `offset` |
| `get_board` | One board with its columns, its cards and `specNote` when a spec is pinned | `boardId` |
| `create_board` | Makes a board, with the default columns unless you pass your own | `title`, `category`, `statuses` |
| `create_board_item` | Adds a card and returns it with its id | `boardId`, `text`, `status`, `description` |
| `update_board_item` | Changes a card's text, priority, score, human assignee or reminder | `boardId`, `itemId`, `text`, `priority`, `score`, `assignee`, `reminder` |
| `move_board_item` | Moves a card to another column and records it in the card's history | `boardId`, `itemId`, `status` |

The default columns are `todo`, `in_progress`, `completed` and `paused`. Moving a card into a column marked `autoComplete` also marks it completed. A column the board doesn't have is refused, and the error lists the ones it does. Updating or moving a card returns that card without its history, not the whole board.

```json
{
  "title": "Parser rewrite",
  "category": "Work",
  "statuses": [
    { "id": "todo", "label": "To Do", "order": 0 },
    { "id": "in_progress", "label": "In Progress", "order": 1 },
    { "id": "review", "label": "Review", "order": 2 },
    { "id": "done", "label": "Done", "order": 3, "autoComplete": true }
  ]
}
```

```json
{ "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "text": "Build the parser", "status": "todo", "description": "Tokenizer and recursive descent parser" }
```

```json
{ "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "itemId": "1759222800417", "status": "in_progress" }
```

`assignee` on `update_board_item` is a Jotty username, and assigning somebody other than yourself notifies them. Agents are something else, see below.

---

## Agent coordination

These four tools let an external harness run several AI agents against one board. Jotty stores the plan, who holds which card and how far they got. It doesn't start, schedule, retry or watch any agent. The `agents` guide from `mcp_docs` walks through the whole workflow and has a spec note template.

| Tool | What it does | Arguments |
|---|---|---|
| `set_board_spec` | Pins a note to a board as its spec, or unpins it | `boardId`, `noteId` |
| `assign_agent` | Puts an agent on a card, or takes it off | `boardId`, `itemId`, `agent` |
| `get_task_context` | One card with everything an agent needs to work on it | `boardId`, `itemId` |
| `list_agent_tasks` | Cards that have an agent, across the boards you can see | `agent`, `boardId`, `status`, `includeCompleted`, `limit`, `offset` |

### `set_board_spec`

Pins one note as the board's spec. You need edit permission on the board and read permission on the note, and the note can't be encrypted. A board has one spec at a time, so pinning another note replaces it. An empty or `null` `noteId` unpins it.

```json
{ "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "noteId": "3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7" }
```

It answers with the agents the spec lists:

```json
{
  "success": true,
  "data": {
    "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50",
    "specNote": "3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7",
    "status": "linked",
    "agents": [
      { "id": "parser-bot", "role": "tokenizer and parser" },
      { "id": "ui-bot", "role": "editor integration" }
    ]
  }
}
```

`status` is `linked`, `none` when nothing is pinned, `missing` when the note is gone or you can't read it, or `encrypted`.

```json
{ "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "noteId": null }
```

### `assign_agent`

Puts an agent id on a card. You need edit permission on the board. The board doesn't need a spec, and the id doesn't have to be in its `## Agents` section. When the spec doesn't list it, or the card's task line names another agent, the answer carries a `warning` saying so. An empty or `null` `agent` takes the agent off the card.

Agent ids are 1 to 64 letters, digits, dots, dashes or underscores, with no spaces, starting with a letter or digit. Jotty trims and lowercases what you send, so `Parser-Bot` becomes `parser-bot` and `Parser Bot` is refused.

```json
{ "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "itemId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800417", "agent": "parser-bot" }
```

```json
{ "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "itemId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800417", "agent": "" }
```

It returns the changed card. The human `assignee` stays as it was, and nobody gets a notification. A `warning` next to the card means the spec's roster doesn't list the agent, or the card's task line names a different one. Fix whichever is wrong.

### `get_task_context`

Everything an agent needs for one card in one call: the card, the board's columns, the agent and its other open cards, the card's dependencies with their status, and the parts of the spec that matter.

```json
{ "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "itemId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800417" }
```

```json
{
  "success": true,
  "data": {
    "board": {
      "id": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50",
      "title": "Parser rewrite",
      "category": "Work",
      "owner": "alice",
      "statuses": [{ "id": "todo", "label": "To Do", "order": 0, "count": 2 }],
      "specNote": "3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7"
    },
    "card": {
      "id": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800417",
      "text": "Build the parser",
      "status": "in_progress",
      "statusLabel": "In Progress",
      "completed": false,
      "agent": "parser-bot",
      "children": [],
      "history": []
    },
    "agent": { "id": "parser-bot", "indexed": true, "role": "tokenizer and parser", "openTasks": [] },
    "dependencies": [
      { "itemId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800000", "found": true, "text": "Agree on the grammar", "status": "done", "completed": true }
    ],
    "spec": {
      "status": "linked",
      "note": { "id": "3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7", "title": "Spec: Parser rewrite", "category": "Work", "updatedAt": "2026-09-30T10:00:00.000Z", "contentLength": 2400 },
      "goal": "Replace the regex parser with a real one.",
      "acceptance": "- All fixtures in tests/parser pass",
      "decisions": "- Recursive descent, no generator",
      "references": "- repo: github.com/example/parser / branch: rewrite",
      "agents": [{ "id": "parser-bot", "role": "tokenizer and parser" }],
      "task": { "line": "`c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800417` - Build the parser - agent `parser-bot` - depends on `c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800000`", "dependsOn": ["c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800000"], "agent": "parser-bot", "agentMatches": true },
      "progress": ["- `c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800417` / `parser-bot` - tokenizer done, commit 1a2b3c4"],
      "blockers": [],
      "handover": [],
      "truncated": false
    }
  }
}
```

- `goal`, `acceptance`, `decisions` and `references` are the whole section. `progress`, `blockers` and `handover` only hold the entries that mention this card's id, its short id or its agent.
- `agent.indexed` is `false` when the roster doesn't list the agent, and `task.agentMatches` is `false` when the task line names a different one.
- Jotty keeps it short on its own: 2000 characters per section or description, 10 entries of 600 characters per list, 25 children and 25 open tasks. `truncated` is `true` when it cut something. Read the spec note with `get_note` when you need all of it.
- An encrypted spec comes back as `status: encrypted` with no content, and one that's gone or that you can't read as `missing`.
- A big context can still go past the MCP answer size. Pass a larger `maxChars` to get it whole.

### `list_agent_tasks`

Cards that have an agent, from every board you can see, sub-cards included. Completed cards are left out unless you pass `includeCompleted`. 25 at a time, with `total` and `offset` for the next page.

| Argument | What it does |
|---|---|
| `agent` | Only this agent's cards, matched exactly |
| `boardId` | Only this board |
| `status` | Comma separated column ids, like `todo,in_progress` |
| `includeCompleted` | `"true"` to include completed cards |
| `limit`, `offset` | Page size and where to start |

```json
{ "agent": "parser-bot", "status": "todo,in_progress" }
```

```json
{ "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "includeCompleted": "true", "limit": 50, "offset": 0 }
```

```json
{
  "tasks": [
    {
      "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50",
      "boardTitle": "Parser rewrite",
      "specNote": "3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7",
      "itemId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800417",
      "text": "Build the parser",
      "status": "in_progress",
      "statusLabel": "In Progress",
      "completed": false,
      "agent": "parser-bot",
      "lastModifiedAt": "2026-09-30T10:12:00.000Z"
    }
  ],
  "total": 1
}
```

---

## Links and shares

The assistant can follow the links between items and see what's shared.

| Tool | What it does | Arguments |
|---|---|---|
| `get_related` | What links to an item and what it links to, as titles. Each link says whether it's a `link`, `mention`, `checklist` or `wiki` | `itemId` |
| `get_brain` | The items around one item, or your most linked items. 60 at most by default | `focus`, `depth` (1 to 3), `limit`, `suggestions` |
| `list_orphans` | Items with no links. That's normal, it isn't a to-do list | `type`, `limit`, `offset` |
| `connect_items` | Links a note to another item it relates to | `source`, `target`, `style` (`append` or `mention`) |
| `disconnect_items` | Takes a note's links to an item back out, and closes the gap they leave | `source`, `target` |
| `list_shares` | What other people shared with you and what you shared, with who can do what. Read only | `direction` (`withMe` or `byMe`), `type`, `limit`, `offset` |

```json
{ "source": "3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7", "target": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "style": "append" }
```

```json
{ "focus": "3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7", "depth": 1 }
```

`style=mention` only works when the source note already has the target's title as plain text. `style=append` always works.

---

## Guides

| Tool | What it does | Arguments |
|---|---|---|
| `mcp_docs` | This guide and the `agents` guide, which ship with the MCP server. Without `docId` it lists them | `docId`, `offset`, `limit` |
| `jotty_docs` | Jotty's own guides, the How To pages in the app. Without `docId` it lists them | `docId`, `offset`, `limit` |

```json
{ "docId": "agents" }
```

---

## Duplicate UUIDs

They usually show up when a script copies a note file. The file with the oldest `createdAt` keeps the UUID, and the copies stay hidden until you repair them. `health` tells you when you have any.

| Tool | What it does | Arguments |
|---|---|---|
| `list_duplicate_uuids` | Which UUIDs more than one file uses, and which file keeps each one | `username`, `acrossUsers` |
| `repair_duplicate_uuid` | Gives the newer file, or the one you pick, a new UUID. Links whose text names that file move with it. Links that could mean either file stay put, and the tool lists them | `uuid`, `path`, `username` |

```json
{ "uuid": "5e0c8b14-2f7a-4d93-8b61-c3a9e7d2f016" }
```

---

## Everything else

| Tool | What it does | Arguments |
|---|---|---|
| `discover` | Lists the operations the other tools don't cover. Pass `operationId` to get that operation's arguments | `tag`, `operationId` |
| `call_operation` | Calls any operation by id. This is how you reach tasks, statuses, reminders, exports and logs | `operationId`, `arguments` |
| `health` | Says whether Jotty is reachable, which version it runs and whether the API key works | none |

```json
{ "tag": "Kanban" }
```

```json
{ "operationId": "setBoardStatuses", "arguments": { "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "statuses": [{ "id": "todo", "label": "To Do", "order": 0 }] } }
```
