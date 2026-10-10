# Coordinating agents

A Kanban board and one note can be the shared memory for a team of AI agents. A coordinator writes the plan and hands out cards, workers pick up their cards, and anybody who opens a fresh session later can read where things stand. Every tool used here is described in the `tools` guide, which `mcp_docs` returns.

---

## What Jotty does and what it doesn't

Jotty stores things:

- **The spec note**, one normal note pinned to the board. It holds the goal, the agents, the task index, decisions, progress, blockers and handover.
- **The board**. Each card is a task, and its column is the task's state.
- **The agent on each card**, an id like `parser-bot` that says which worker holds it.
- **History**. Every column change goes into the card's history.

Your harness does everything else. The harness is whatever runs the agents: Claude Code with subagents, a script, a CI job. It starts workers, decides when they run, retries them, times them out, stops them and replaces them.

Jotty runs nothing. An agent on a card means somebody wrote that name there, not that a worker is running.

> [!IMPORTANT]
> Agents aren't accounts. An agent id is a label the coordinator picks. It has no login, gets no notifications and can't receive a share. Every call acts as the user who owns the API key, and card history records that user. The human **assignee** field on a card is separate, still takes a Jotty username, and assigning somebody there still notifies them.

---

## The spec note

The spec is a note with `##` sections. Jotty matches the headings without caring about case, and ignores sections it doesn't know, so you can add your own.

Copy this, change the title and fill it in:

```markdown
# Spec: Parser rewrite

## Goal
Replace the regex parser with a recursive descent parser that handles every fixture.

## Acceptance criteria
- Every file in tests/parser/fixtures parses
- No new runtime dependency
- The editor highlights errors on the right line

## Agents
- `coordinator` - plans, reviews, owns Decisions
- `parser-bot` - tokenizer and parser, src/parser only
- `ui-bot` - editor integration, src/editor only

## Tasks
- `<card id>` - Agree on the grammar - agent `coordinator`
- `<card id>` - Build the parser - agent `parser-bot` - depends on `<card id>`
- `<card id>` - Show parse errors in the editor - agent `ui-bot` - depends on `<card id>`

## Decisions

## References
- repo: github.com/example/parser / branch: rewrite / commit: 0000000 / artifact: none yet

## Progress

## Blockers

## Handover
```

| Section | Who writes it | What goes in it |
|---|---|---|
| Goal | Coordinator | What done looks like, in a paragraph |
| Acceptance criteria | Coordinator | Checks a reviewer can run |
| Agents | Coordinator | One bullet per agent. The first `backticked` word is the agent id, the rest is its role |
| Tasks | Coordinator | One bullet per card. The first `backticked` word is the card id, `agent` is followed by the agent id, `depends on` by the card ids it waits for |
| Decisions | Coordinator only | Choices everybody has to follow |
| References | Coordinator | Repo, branch, commits, links |
| Progress | Each worker, own entries only | What got done, with evidence |
| Blockers | Each worker, own entries only | What stops a card |
| Handover | Each worker, own entries only | The next action for whoever picks the card up |

Card ids look like the board's UUID followed by a dash and a number. Anywhere Jotty takes a card id, in the spec or in a tool call, the number alone works too, so `` `1759222800417` `` is enough and saves a lot of typing.

In Progress, Blockers and Handover, start each entry with the card id and the agent id, like `` `<card id>` / `parser-bot` - ... ``. `get_task_context` only returns the entries that mention the card or its agent, so an entry without them won't reach anybody.

`## Agents` is the roster. `assign_agent` takes any valid agent id, and answers with a `warning` when the roster doesn't list it or the card's task line names a different agent. `get_task_context` reports the same two problems as `indexed: false` and `task.agentMatches: false`. Add a roster line when a new worker joins.

People can assign agents from the board too. The card's Assignee field searches users as you type, and when the name doesn't match anybody it offers it as an agent, with its robot avatar.

> [!NOTE]
> An encrypted note can't be a spec. Jotty never reads inside encrypted notes, so it couldn't find the agents or the tasks. If a pinned spec gets encrypted later, the board reports it as `encrypted` and `get_task_context` leaves the spec out until you pin another note.

---

## Setting it up

The ids below are examples. Each step returns the id the next one needs.

**1. Create the spec note** with `create_note`. Leave `## Tasks` empty for now. The cards don't exist yet.

```json
{ "title": "Spec: Parser rewrite", "category": "Work", "content": "# Spec: Parser rewrite\n\n## Goal\nReplace the regex parser with a recursive descent parser.\n\n## Acceptance criteria\n- Every file in tests/parser/fixtures parses\n\n## Agents\n- `coordinator` - plans, reviews, owns Decisions\n- `parser-bot` - tokenizer and parser, src/parser only\n- `ui-bot` - editor integration, src/editor only\n\n## Tasks\n\n## Decisions\n\n## References\n- repo: github.com/example/parser / branch: rewrite\n\n## Progress\n\n## Blockers\n\n## Handover\n" }
```

The answer's `data.id` is the note's UUID, here `3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7`.

**2. Create the board** with `create_board`. A `review` column gives the coordinator a place to check work before it counts as done.

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

The answer's `data.id` is the board's UUID, here `c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50`.

**3. Add a card per task** with `create_board_item`, and keep each `data.id`.

```json
{ "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "text": "Build the parser", "status": "todo", "description": "Tokenizer and recursive descent parser in src/parser" }
```

Here the three cards come back as `c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800000` (grammar), `c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800417` (parser) and `c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50-1759222800903` (editor). From here on the examples use the short form, `1759222800417` and so on.

**4. Fill in the task index** with `patch_note`, anchored on the empty section.

```json
{
  "noteId": "3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7",
  "find": "## Tasks\n\n## Decisions",
  "replace": "## Tasks\n- `1759222800000` - Agree on the grammar - agent `coordinator`\n- `1759222800417` - Build the parser - agent `parser-bot` - depends on `1759222800000`\n- `1759222800903` - Show parse errors in the editor - agent `ui-bot` - depends on `1759222800417`\n\n## Decisions"
}
```

**5. Pin the spec to the board** with `set_board_spec`. The answer lists the agents it found, so check that every worker is there.

```json
{ "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "noteId": "3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7" }
```

**6. Link the spec to the board** with `connect_items`. The pin is what counts. The link makes the pair show up in `get_related` and the brain, so somebody starting from the note can find the board.

```json
{ "source": "3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7", "target": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "style": "append" }
```

**7. Put an agent on each card** with `assign_agent`.

```json
{ "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "itemId": "1759222800417", "agent": "parser-bot" }
```

An empty `agent` takes it off again. Check the answer for a `warning`, which means the roster or the task line disagrees with what you just did.

---

## What a worker does

A worker gets its agent id and the board id from the harness, then:

1. `list_agent_tasks` with its own id to find its cards.

   ```json
   { "agent": "parser-bot", "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "status": "todo,in_progress" }
   ```

2. `get_task_context` on the card it's going to work on. That's the card, its dependencies, the goal, the decisions and any progress or handover left for it.

   ```json
   { "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "itemId": "1759222800417" }
   ```

3. Checks `dependencies`. Every entry should be `found` and `completed` before it starts.
4. `move_board_item` to `in_progress`.
5. Does the work, outside Jotty.
6. Adds a Progress entry with the evidence, see below.
7. `move_board_item` to `review`, or to `done` when there's no review step.
8. If it stops before the card is done, adds a Handover entry saying what the next worker should do first.

### Dependencies

Dependencies live in the Tasks section, as `depends on` followed by card ids. `get_task_context` looks each one up and returns its text, column and whether it's completed. A dependency that isn't on the board comes back with `found: false`.

Jotty doesn't enforce them. A card can move while its dependencies are still open, so the worker or the harness has to check.

### The card column is the task's state

The column a card sits in is the one true answer to "is this done". Move cards with `move_board_item`, which also records the change in the card's history. Don't write "status: done" into the spec. When the spec and the board disagree, the board is right.

The spec is for the rest: the plan, the decisions, the evidence and the handover.

### Record evidence before a card moves to done

Before a card leaves `in_progress`, its worker adds a Progress entry that lets somebody else check the work without asking: the commit, the test command and what it printed, and links to anything it produced.

```json
{
  "noteId": "3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7",
  "find": "\n## Blockers",
  "replace": "- `1759222800417` / `parser-bot` - parser done. commit 1a2b3c4 on rewrite. `bun test tests/parser` 48 pass 0 fail. artifact: https://ci.example.com/runs/812\n\n## Blockers"
}
```

Then it moves the card:

```json
{ "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50", "itemId": "1759222800417", "status": "review" }
```

---

## Writing to the spec without overwriting each other

Several agents write to one note, so a careless write loses somebody else's lines. These rules keep that from happening.

- **Use `patch_note`, never `update_note`, from a worker.** `update_note` replaces the whole note with what the agent sent. If another agent added a line in between, that line is gone. `patch_note` changes one piece of text and leaves the rest as it is on disk.
- **Jotty applies each `patch_note` on its own**, against the note as it is at that moment. Two workers appending before the same heading both land, one after the other.
- **Re-read before you patch.** Use `get_note` or `get_task_context` right before, not a copy from an hour ago.
- **Anchor on a small, unique piece of text.** A heading such as `\n## Blockers` for appending to the end of Progress, or the start of your own entry when you edit it. The end of the note counts as a line end, so `## Handover\n` works on the last section too. `patch_note` refuses when the text isn't there or shows up twice. When it refuses, re-read and pick a better anchor. Don't fall back to `update_note`.
- **The coordinator owns Decisions**, and Goal, Acceptance criteria, Agents, Tasks and References. Workers put what they want decided in Blockers and let the coordinator write the decision.
- **Workers only append**, and only change entries that start with their own card id and agent id.
- **`update_note` on the spec is for the coordinator**, and only when no worker is running.

---

## Picking up in a clean session

A new session, a new coordinator or a person can rebuild the picture from one id.

Starting from the **board id**:

1. `get_board` with `{ "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50" }`. Its `specNote` is the spec's UUID.
2. `get_note` with `{ "noteId": "3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7" }`. For a long spec, read on with `offset` until there's no `nextOffset`.
3. `list_agent_tasks` with `{ "boardId": "c41e7a92-0d5b-4f38-a6e1-7b2c9d8f3a50" }` for the open cards and who holds them.
4. `get_task_context` on each open card, and read its Handover entries first.

Starting from the **spec note id**:

1. `get_note` to read the plan.
2. `get_related` with `{ "itemId": "3b9d6f2e-8a41-4c7e-b5d0-91f2a6c4e8b7" }` shows the board you linked in step 6 of the setup. `list_agent_tasks` works too, since every task carries its `boardId` and `specNote`.
3. Carry on from step 1 of the board list.

---

## Replacing a worker or moving a card

Jotty can't tell whether a worker is alive. An agent on a card and a card in `in_progress` only say what was last written. `lastModifiedAt` is when somebody last touched the card, not a heartbeat.

So before you replace a worker or give its card to another agent, the harness checks its own worker: the process, the job, the session, whatever it started. Only when the old worker is really gone:

1. Read the card's Handover and Progress entries with `get_task_context`.
2. Make sure the new agent is under `## Agents`. If not, the coordinator adds it with `patch_note`.
3. `assign_agent` the card to the new agent.
4. Add a Handover entry naming the old agent, the new one and what the new one should do first.

Never let two live workers hold the same card. Jotty won't stop it, and they'll overwrite each other's work outside Jotty.

---

## Private and shared boards

On a **private board**, everything runs as the board owner's API key. That's the simplest setup, and every agent can do everything.

On a **shared board**, each collaborator's API key acts as that collaborator, and Jotty checks every call against their share:

- Moving cards and putting agents on them needs edit permission on the board.
- Reading the spec through `get_task_context` needs read permission on the spec note. The spec sits in the owner's folder, so share it too with anybody who works the board. Without that, they see the spec as `missing`.
- Workers that write progress need edit permission on the spec note.
- `list_agent_tasks` and `get_task_context` only show boards and specs the caller can see.

---

## Limits worth knowing

- One spec per board. Many notes can link to a board, only the pinned one is the spec.
- Agent ids are 1 to 64 letters, digits, dots, dashes or underscores, with no spaces, starting with a letter or digit. Jotty lowercases them.
- `get_task_context` keeps each section to 2000 characters and each list to 10 entries, and sets `truncated` when it cut something. Read the whole spec with `get_note` when you need it.
- `list_agent_tasks` returns 25 cards at a time. Use `offset` for the next page.
- Agents get no notifications and don't appear in user lists. People who want to know what happened read the board.
