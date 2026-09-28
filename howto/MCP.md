# Jotty MCP server

The MCP server lets an AI assistant such as Claude, Cursor or anything else that speaks MCP read and change your notes, checklists and Kanban boards. It talks to Jotty over the [REST API](API.md), so every request acts as the user who owns the API key.

> [!CAUTION]
> The assistant can do anything your API key can, deleting included. Give it a key from an account that only holds what you're happy for it to touch.

You need Jotty 1.28.0 or newer and an API key. [The API guide](API.md) explains how to generate one.

## How it knows what Jotty can do

Jotty publishes its own API description at `/api/openapi.json`. The MCP server reads it the first time a tool runs and caches it for five minutes. Tool names, descriptions and arguments all come from there.

- Pointed at an older instance, it leaves out the tools that instance has no endpoint for, and `discover` lists them as unavailable.
- A new Jotty route works straight away through `call_operation`, without updating the MCP server.

---

## Running it with Docker

Use this when several people share one MCP server, or when you want it next to Jotty on a server. Each client sends its own Jotty key, so each session acts as its own user.

`docker-compose.mcp.yml` in the Jotty repo runs Jotty and the MCP server on one network:

```bash
mkdir -p ./data ./config ./cache && sudo chown -R 1000:1000 ./data ./config ./cache
docker compose -f docker-compose.mcp.yml up -d
```

The MCP endpoint is `http://<host>:1133/mcp`, with a health check at `/healthz`.

The `ghcr.io/fccview/jotty-mcp` image carries the same version tags as Jotty. If you pin Jotty to a version, pin the MCP server to the same one.

> [!IMPORTANT]
> Change `JOTTY_MCP_AUTH_TOKEN` from `changeme` before you start it. Every `/mcp` request has to send `Authorization: Bearer <token>`. Leaving the token empty opens the endpoint to anyone who can reach the port, which is fine on a private network and a bad idea anywhere else.

Adding it to Claude Code:

```bash
claude mcp add --transport http jotty http://localhost:1133/mcp \
  --header "Authorization: Bearer <token>" \
  --header "x-api-key: ck_..."
```

> [!WARNING]
> `JOTTY_API_KEY` on the MCP service is a fallback for clients that can't send `x-api-key`. With it set, anyone who reaches the port with the token acts as that key's owner. The server logs a warning at startup when you set both.

## Running it with Bun

Use this on your own machine. Your MCP client starts the server itself and the key never leaves your computer. You need [Bun](https://bun.sh) 1.3 or newer.

```bash
cd mcp-server
bun install
```

Then add it to your client's MCP config:

```jsonc
{
  "mcpServers": {
    "jotty": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/jotty/mcp-server/src/main.ts"],
      "env": {
        "JOTTY_URL": "https://jotty.example.com",
        "JOTTY_API_KEY": "ck_..."
      }
    }
  }
}
```

Or in Claude Code:

```bash
claude mcp add jotty -e JOTTY_URL=https://jotty.example.com -e JOTTY_API_KEY=ck_... -- bun run /absolute/path/to/jotty/mcp-server/src/main.ts
```

---

## Tools

Each everyday action has its own tool, named after its API operation in snake case, so `listNotes` becomes `list_notes`. They cover search, categories, the usage summary, notes, checklists and their items, and the common board actions.

The assistant can also follow your [links](BRAIN.md) and see what's shared:

| Tool | What it does |
|---|---|
| `get_related` | What links to an item and what it links to, as titles. The assistant reads only the ones that matter instead of opening everything |
| `get_brain` | The items around one item, or your most linked items |
| `list_orphans` | Items with no links |
| `connect_items` | Links a note to another item, so notes the assistant writes join the map |
| `list_shares` | What other people shared with you and what you shared, with who can do what. Read only |

Three more tools reach everything else:

| Tool | What it does |
|---|---|
| `discover` | Lists the operations the other tools don't cover. Pass `operationId` to get any operation's arguments. |
| `call_operation` | Calls any operation by id. This is how you reach tasks, statuses, reminders, exports and logs. |
| `health` | Says whether Jotty is reachable, which version it runs and whether the API key works. |

Notes, checklists and boards are addressed by UUID, so list or search first to get one. Checklist items take their `itemIndex`, like `0` or `2.1`, which `get_checklist` returns for every item.

When something fails, the tool says why and what to try next. It also refuses arguments the operation doesn't take and lists the ones it does.

## Keeping the context small

An assistant reads every character a tool sends back, and a long answer pushes the rest of the conversation out. So the server keeps answers short:

- `list_notes`, `list_checklists` and `list_boards` return 25 results at a time in a summary view. Notes come with a short excerpt instead of their content, checklists with item counts, and boards with card counts per column. `total` says how many matched, `offset` reads the next page, and `view=full` gets everything.
- An answer longer than `JOTTY_MCP_MAX_TEXT_CHARS` keeps the rows that fit and adds a `trimmed` field with the `offset` for the next ones. A single record that's still too long gets cut.
- Updating or moving a card returns that card, not the whole board.
- Search puts the best matches first and gives you the `uuid` the other tools take and the file name as `slug`.
- `get_brain` returns 60 items at most by default, nearest and most linked first, and says when it left some out.
- Export downloads aren't fetched. You get the link to download the file yourself.

> [!NOTE]
> Encrypted notes stay opaque here too. They never get an excerpt, and they come back flagged `encrypted`.

## Settings

| Variable | Default | What it does |
|---|---|---|
| `JOTTY_URL` | `http://localhost:3000` | Your Jotty address, without `/api` |
| `JOTTY_API_KEY` | | The key to use with Bun, or the fallback for Docker sessions |
| `JOTTY_MCP_TRANSPORT` | `stdio` | `stdio` when your client starts the server, `http` for a shared one |
| `JOTTY_MCP_PORT` | `3001` | Port the HTTP server listens on inside the container |
| `JOTTY_MCP_BIND_HOST` | all interfaces | Address the HTTP server binds to |
| `JOTTY_MCP_AUTH_TOKEN` | | Bearer token every `/mcp` request must send |
| `JOTTY_MCP_TIMEOUT_MS` | `30000` | How long to wait for Jotty before giving up |
| `JOTTY_MCP_MAX_TEXT_CHARS` | `12000` | Longest answer a tool sends back, in characters |
| `JOTTY_MCP_SPEC_TTL_MS` | `300000` | How long to cache the API description |
| `JOTTY_MCP_LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` or `silent`. Logs go to stderr |
