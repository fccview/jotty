# jotty-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes a
**[jotty·page](https://jotty.page)** instance to AI clients (Claude Desktop,
Cursor, etc.). It proxies every tool call to your Jotty instance's
[REST API](../howto/API.md) using an API key, so an assistant can read and manage
your checklists, notes, kanban boards, and more.

It ships inside the Jotty repository as a self-contained subpackage with its **own**
`node_modules` (so its `zod` version never clashes with the Next.js app).

## Two ways to run it

The same binary supports two transports, picked by `MCP_TRANSPORT`. Pick one:

### 1. Local (stdio) — run on your personal machine  *(default, simplest)*

The MCP server is a **local process** your AI client launches; it makes outbound
HTTPS calls to your Jotty instance. The API key lives on your machine. Nothing new
runs on the server.

```
your machine                            jotty server
─────────────                           ────────────────
Cursor / Claude Desktop
     │ spawns child process (stdio)
     ▼
 jotty-mcp  ──── HTTPS, x-api-key ───►  Jotty REST API (unchanged)
 JOTTY_URL + JOTTY_API_KEY from env
```

Client config (Cursor / Claude Desktop):

```jsonc
{ "mcpServers": { "jotty": {
  "command": "node",
  "args": ["/absolute/path/to/mcp-server/dist/index.js"],
  "env": { "JOTTY_URL": "https://jotty.example.com", "JOTTY_API_KEY": "ck_…" }
}}}
```

→ Best for personal use: key never leaves your machine, Jotty stays untouched.

### 2. Hosted (HTTP) — run next to the Jotty app

The MCP server runs **on the Jotty host** as a small listening service; your AI
client just points at a URL. Each client sends its own Jotty `x-api-key`, so
multiple users keep their accounts isolated. Protect the endpoint with
`MCP_TOKEN` (Bearer) since it's network-exposed.

```
your machine                              jotty server
─────────────                             ────────────────────────────
Cursor                                    jotty app (:3000)  ← unchanged
   │ HTTPS to URL                              ▲
   │ headers: x-api-key + Authorization        │ localhost
   ▼                                           │
 jotty-mcp (MCP_TRANSPORT=http, :3001)  ───────┘
 JOTTY_URL=http://localhost:3000
```

Client config (Cursor):

```jsonc
{ "mcpServers": { "jotty": {
  "url": "https://jotty.example.com/mcp",
  "headers": { "x-api-key": "ck_…", "Authorization": "Bearer your-mcp-token" }
}}}
```

→ Best for shared/multi-user: one endpoint, no local process per client. (Claude
Desktop's stdio-only builds should use option 1.)

Detailed setup for both is below.

## Not bundled with the Jotty Docker image

`jotty-mcp` is a **separate program**, not part of the Jotty web app:

- It is **not** included in the published Jotty Docker image
  (`ghcr.io/fccview/jotty:latest`) and is **not** built by `next build` / the
  `Dockerfile`.
- It is **not** started by `docker compose` — the compose file only runs the
  `jotty` service (and optional `api-docs`). There is no `jotty-mcp` service
  defined, so hosting Jotty via Docker Compose runs Jotty only and **does not run
  the MCP server**.
- It has its **own** `package.json` / `node_modules`, deliberately decoupled from
  the Next.js app so dependency versions (e.g. `zod`) never clash.

So you must run it yourself, in one of the two ways above:

- **Local (stdio):** build and run `jotty-mcp` on **your personal machine** — your
  AI client (Cursor / Claude Desktop) launches it. Nothing to add to your Jotty
  deployment.
- **Hosted (HTTP):** run it as a **separate sidecar** next to Jotty (e.g. its own
  container/process, with `JOTTY_URL=http://jotty:3000`). It is never baked into
  the Jotty image and never auto-started by Jotty.

In short: Jotty's deployment is unchanged by this subpackage; `jotty-mcp` is an
optional companion you run separately.

## What it exposes

54 tools across the full Jotty API:

| Area | Tools |
| --- | --- |
| **Checklists** | `list_checklists`, `create_checklist`, `update_checklist`, `delete_checklist`, `create_checklist_item`, `update_checklist_item`, `delete_checklist_item`, `check_item`, `uncheck_item`, `reorder_checklist_items` |
| **Notes** | `list_notes`, `create_note`, `get_note`, `update_note`, `delete_note` |
| **Tasks (kanban columns)** | `list_tasks`, `create_task`, `get_task`, `update_task`, `delete_task`, `get_task_statuses`, `create_task_status`, `update_task_status`, `delete_task_status`, `create_task_item`, `get_task_item`, `move_task_item`, `delete_task_item` |
| **Kanban boards** | `list_boards`, `create_board`, `get_board`, `update_board`, `delete_board`, `set_board_statuses`, `create_board_item`, `update_board_item`, `delete_board_item`, `move_board_item`, `assign_board_item`, `set_board_item_reminder`, `clear_board_item_reminder`, `get_board_calendar` |
| **Discovery** | `list_categories`, `get_summary`, `search` |
| **Admin / exports / logs** | `request_export`, `get_export_progress`, `list_logs`, `export_logs`, `get_logs_stats`, `rebuild_link_index` |
| **Misc** | `health`, `get_user`, `get_current_user`, `rebuild_link_index` |

Tool arguments are validated with JSON Schema (via `zod`). Items are addressed by
dot-notation index paths (e.g. `0.1`) for nested sub-items, and by UUID for
lists/notes/boards — matching the [API docs](../howto/API.md).

## Prerequisites

- Node.js **20+** (uses the built-in `fetch`).
- A running Jotty instance you can reach over HTTP(S).
- A Jotty **API key** — generate one in Jotty → **Profile → Settings → API Key**
  (it looks like `ck_…`).

## Build

```bash
cd mcp-server
npm install
npm run build      # outputs to dist/
```

## Configure (local / stdio mode)

In local stdio mode the server reads two required environment variables (and one
optional). For HTTP mode env, see [HTTP / remote mode](#http--remote-mode-streamable-http) below.

| Variable | Required | Description |
| --- | --- | --- |
| `JOTTY_URL` | yes | Base URL of your Jotty instance, e.g. `https://jotty.example.com` |
| `JOTTY_API_KEY` | yes | Your `ck_…` API key |
| `JOTTY_TIMEOUT_MS` | no | Per-request timeout in ms (default `30000`) |

## Run

```bash
JOTTY_URL=https://jotty.example.com JOTTY_API_KEY=ck_your_key node dist/index.js
```

It speaks MCP over stdio, so you run it as a child process of your MCP client.

## Use with Claude Desktop

Add an entry to your `claude_desktop_config.json` (Claude → Settings → Developer →
Edit Config):

```jsonc
{
  "mcpServers": {
    "jotty": {
      "command": "node",
      "args": ["/absolute/path/to/jotty/mcp-server/dist/index.js"],
      "env": {
        "JOTTY_URL": "https://jotty.example.com",
        "JOTTY_API_KEY": "ck_your_key"
      }
    }
  }
}
```

Restart Claude Desktop and you'll see the Jotty tools available.

## Use with Cursor

Add to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in your project):

```jsonc
{
  "mcpServers": {
    "jotty": {
      "command": "node",
      "args": ["/absolute/path/to/jotty/mcp-server/dist/index.js"],
      "env": {
        "JOTTY_URL": "https://jotty.example.com",
        "JOTTY_API_KEY": "ck_your_key"
      }
    }
  }
}
```

## HTTP / remote mode (Streamable HTTP)

The stdio mode above runs the server **on your own machine**. If you'd rather run
the MCP server **on the Jotty host** (or anywhere reachable) and point your client
at a URL, use the HTTP transport. Same binary, selected by `MCP_TRANSPORT=http`.

### 1. Run the server on the Jotty host

```bash
# On the server that runs Jotty (e.g. Jotty on :3000)
cd mcp-server && npm install && npm run build

MCP_TRANSPORT=http \
JOTTY_URL=http://localhost:3000 \
MCP_PORT=3001 \
MCP_HOST=0.0.0.0 \
MCP_TOKEN=choose-a-long-random-secret \
  node dist/index.js
```

Environment (HTTP mode):

| Variable | Required | Description |
| --- | --- | --- |
| `MCP_TRANSPORT` | yes | set to `http` |
| `JOTTY_URL` | yes | where Jotty's REST API is — usually `http://localhost:3000` when colocated |
| `MCP_PORT` | no | bind port (default `3001`) |
| `MCP_HOST` | no | bind host (default `0.0.0.0`; use `127.0.0.1` for local-only) |
| `MCP_TOKEN` | recommended | shared secret; clients must send `Authorization: Bearer <token>`. Without it the endpoint is open — restrict the network (localhost / Tailscale / reverse proxy). |
| `JOTTY_API_KEY` | optional | server-side fallback Jotty key used only when a client omits its own `x-api-key` |

### 2. Connect your client to the URL

The client **does not** set `JOTTY_URL`. It sets the MCP endpoint URL and sends the
Jotty API key as the `x-api-key` header:

**Cursor** (`~/.cursor/mcp.json`):

```jsonc
{
  "mcpServers": {
    "jotty": {
      "url": "https://jotty.example.com/mcp",
      "headers": {
        "x-api-key": "ck_your_key",
        "Authorization": "Bearer choose-a-long-random-secret"
      }
    }
  }
}
```

> If you set `MCP_TOKEN` on the server, include `Authorization: Bearer <token>` in
> the client headers. If you didn't set a token, drop that header.

**Claude Desktop** does not yet support the `url`/remote form in all builds; for
Claude Desktop use the stdio config above. HTTP mode is intended for Cursor and
any client that supports the Streamable HTTP transport.

### Auth model summary

Two independent layers, by design:
- **MCP endpoint auth** (optional, server-side `MCP_TOKEN`): gates who can reach
  the MCP server at all (`Authorization: Bearer`).
- **Jotty account auth** (required, per-client `x-api-key`): which Jotty account
  each session acts as. Each connecting client gets its own `JottyClient`, so
  multiple users on one MCP server keep their own keys/data isolated.

## Security notes

- The Jotty API key grants **full access** to the Jotty account it belongs to.
  Treat it like a password — put it in your MCP client's config, not in source
  files. Rotate it from Jotty → Profile → Settings → API Key.
- **stdio mode:** the server runs locally and only makes outbound HTTPS requests
  to your Jotty URL. No inbound ports are opened.
- **HTTP mode:** the server opens a listening port. Always set `MCP_TOKEN` and/or
  bind to `127.0.0.1` / put it behind a reverse proxy / Tailscale so the endpoint
  isn't publicly reachable. Each session still requires a valid Jotty `x-api-key`.
- Errors from Jotty (bad UUID, missing title, `403`, etc.) are returned to the
  model as MCP `isError` results rather than crashing the server.

## Project layout

```
mcp-server/
  src/
    index.ts            # entrypoint: env config, dispatches stdio vs http
    client.ts           # JottyClient: REST fetch wrapper with x-api-key
    http.ts             # Streamable HTTP transport: per-session McpServer + JottyClient
    tools/
      index.ts          # registerAllTools() aggregator
      shared.ts         # json/text/fail/run result helpers
      types.ts          # ToolModule interface
      checklists.ts     # /api/checklists tools
      notes.ts          # /api/notes tools
      tasks.ts           # /api/tasks tools
      kanban.ts          # /api/kanban tools
      discovery.ts       # categories, summary, search
      admin.ts           # exports, logs, admin
      misc.ts            # health, user, rebuild-index
  scripts/
    smoke.mjs            # stdio protocol smoke test (no Jotty needed)
    integration.mjs      # stdio end-to-end test (needs a running Jotty)
    integration-http.mjs # http end-to-end test (needs running Jotty + http server)
```

## Tests

```bash
# Protocol smoke test — no Jotty instance required
JOTTY_URL=http://127.0.0.1:9 JOTTY_API_KEY=ck_dummy node scripts/smoke.mjs

# stdio end-to-end — run Jotty locally first (e.g. `next dev`),
# inject a test API key for an admin user, then:
JOTTY_URL=http://127.0.0.1:3000 JOTTY_API_KEY=ck_test_… node scripts/integration.mjs

# http end-to-end — also start the http server, then:
#   MCP_TRANSPORT=http JOTTY_URL=http://127.0.0.1:3000 MCP_PORT=3001 node dist/index.js &
MCP_URL=http://127.0.0.1:3001/mcp JOTTY_API_KEY=ck_test_… node scripts/integration-http.mjs
```

## License

MIT, same as Jotty.