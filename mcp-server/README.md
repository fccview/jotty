# jotty-mcp

An MCP server for a Jotty instance. It lets an assistant read and change notes, checklists and Kanban boards as the user who owns the API key.

It lives in the Jotty repo but shares nothing with the app. It has its own `package.json`, runs on [Bun](https://bun.sh) and talks to Jotty over the REST API.

## How it knows the API

Jotty publishes its own contract at `/api/openapi.json`. It's generated from the code that serves each route. The MCP reads it on first use and caches it for five minutes per API key. Tool names, descriptions and input schemas all come from there.

That means:

- Pointing it at an older instance works. Tools for endpoints that instance doesn't have are left out, and `discover` lists them as unavailable.
- A new route in Jotty is reachable straight away through `call_operation`, with no MCP release.
- The only hand-kept list is `src/tools/catalog.ts`, the operation ids that get a dedicated tool.

## Tools

The dedicated tools cover day to day work: search, categories, summary, notes, checklists and their items, and the common board actions. Each one is named after its operation id in snake case (`listNotes` is `list_notes`).

Three built-in tools cover the rest:

| Tool | What it does |
|---|---|
| `discover` | Lists every operation on the instance. Pass `operationId` to get one operation's input schema. |
| `call_operation` | Calls any operation by id. Use it for tasks, statuses, reminders, exports and logs. |
| `health` | Reports whether Jotty is reachable, its version, and whether the API key works. |

Results carry the Jotty response in `structuredContent`. The visible text is the same JSON, cut off at `JOTTY_MCP_MAX_TEXT_CHARS`. Errors come back with `isError` and `{ kind, message, status, hint }`.

## Running it

You need an API key. Generate one in Jotty under Profile.

### stdio, on your own machine

Your MCP client starts the process. The key stays on your machine.

```bash
cd mcp-server
bun install
```

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

Claude Code:

```bash
claude mcp add jotty -e JOTTY_URL=https://jotty.example.com -e JOTTY_API_KEY=ck_... -- bun run /absolute/path/to/jotty/mcp-server/src/main.ts
```

### HTTP, next to Jotty

One server for several users. Each client sends its own Jotty key in `x-api-key`, so every session acts as its own user.

`docker-compose.mcp.yml` in the repo root runs Jotty and the MCP server on one network:

```bash
docker compose -f docker-compose.mcp.yml up -d --build
```

It serves MCP at `http://<host>:3001/mcp` and health at `/healthz`.

Set `JOTTY_MCP_AUTH_TOKEN` and every `/mcp` request has to send `Authorization: Bearer <token>`. Without it the endpoint is open. That's fine on a private network and a bad idea on a public port. If you also set `JOTTY_API_KEY` as a fallback, anyone who reaches the port acts as that user, and the server logs a warning at startup.

```bash
claude mcp add --transport http jotty http://localhost:3001/mcp \
  --header "Authorization: Bearer <token>" \
  --header "x-api-key: ck_..."
```

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `JOTTY_URL` | `http://localhost:3000` | Jotty base URL, without `/api` |
| `JOTTY_API_KEY` | | Key for stdio, fallback for HTTP sessions |
| `JOTTY_MCP_TRANSPORT` | `stdio` | `stdio` or `http` |
| `JOTTY_MCP_PORT` | `3001` | HTTP port |
| `JOTTY_MCP_BIND_HOST` | all interfaces | HTTP bind address |
| `JOTTY_MCP_AUTH_TOKEN` | | Bearer token required on `/mcp` |
| `JOTTY_MCP_TIMEOUT_MS` | `30000` | Per request timeout towards Jotty |
| `JOTTY_MCP_MAX_TEXT_CHARS` | `12000` | Cap on the visible text of a result |
| `JOTTY_MCP_SPEC_TTL_MS` | `300000` | How long the API spec is cached |
| `JOTTY_MCP_LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error`, `silent`. Logs go to stderr. |

## Development

```bash
bun run dev
bun run typecheck
bun test
bun run build
```

Tests start a fake Jotty over real HTTP and drive the server through the MCP SDK client. Nothing is mocked at the fetch level.
