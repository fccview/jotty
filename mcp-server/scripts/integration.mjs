/*
 * Real integration test: starts the built jotty-mcp stdio server pointed at a
 * live Jotty instance and drives authenticated MCP tool calls through it,
 * verifying the full MCP -> REST proxy path returns real data.
 *
 * Env: JOTTY_URL, JOTTY_API_KEY (the test key injected into users.json).
 */
import { spawn } from "node:child_process";

const child = spawn("node", ["dist/index.js"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: ["pipe", "pipe", "pipe"],
});

let buf = "";
const responses = new Map();
child.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (line) {
      try {
        const obj = JSON.parse(line);
        if (obj.id != null) responses.set(obj.id, obj);
      } catch {
        /* ignore */
      }
    }
  }
});
const stderr = [];
child.stderr.on("data", (c) => stderr.push(c.toString()));

let nextId = 1;
const pending = new Map();
function send(method, params) {
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}
// Resolve pending as responses arrive.
const checkInterval = setInterval(() => {
  for (const [id, resolve] of pending) {
    if (responses.has(id)) {
      pending.delete(id);
      resolve(responses.get(id));
    }
  }
}, 50);

function callTool(name, args) {
  return send("tools/call", { name, arguments: args });
}

function parseText(res) {
  const t = res?.result?.content?.[0]?.text;
  return t ? JSON.parse(t) : null;
}

async function main() {
  let ok = true;
  const check = (cond, msg) => {
    if (!cond) {
      ok = false;
      console.error("  FAIL:", msg);
    } else {
      console.log("  ok:", msg);
    }
  };

  // initialize
  const init = await send("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "integration-test", version: "0.0.1" },
  });
  child.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n",
  );
  check(init?.result?.serverInfo?.name === "jotty", "initialize ok");

  // health (public)
  const health = await callTool("health", {});
  const healthData = parseText(health);
  check(healthData?.status === "healthy", "health returns healthy status");
  check(!!healthData?.version, `health version=${healthData?.version}`);

  // list_checklists (authenticated)
  const lists = await callTool("list_checklists", {});
  const listsData = parseText(lists);
  check(Array.isArray(listsData?.checklists), `list_checklists returns array (len=${listsData?.checklists?.length})`);
  const firstList = listsData?.checklists?.[0];
  if (firstList) {
    check(!!firstList.id, `first checklist has id: ${firstList.id}`);
    check(typeof firstList.title === "string", `first checklist has title: ${firstList.title}`);
  }

  // get_summary (authenticated)
  const summary = await callTool("get_summary", {});
  const summaryData = parseText(summary);
  check(!!summaryData?.summary, "get_summary returns summary object");
  check(typeof summaryData.summary.notes?.total === "number", `summary notes.total=${summaryData.summary.notes?.total}`);
  check(typeof summaryData.summary.checklists?.total === "number", `summary checklists.total=${summaryData.summary.checklists?.total}`);

  // list_categories (authenticated)
  const cats = await callTool("list_categories", {});
  const catsData = parseText(cats);
  check(!!catsData?.categories, "list_categories returns categories");
  check(Array.isArray(catsData.categories?.notes), "categories.notes is array");
  check(Array.isArray(catsData.categories?.checklists), "categories.checklists is array");

  // list_notes (authenticated)
  const notes = await callTool("list_notes", {});
  const notesData = parseText(notes);
  check(Array.isArray(notesData?.notes), `list_notes returns array (len=${notesData?.notes?.length})`);

  // create + delete a checklist round-trip
  const created = await callTool("create_checklist", {
    title: "MCP Integration Test Checklist",
    category: "MCP-Test",
    type: "simple",
  });
  const createdData = parseText(created);
  const newId = createdData?.data?.id;
  check(!!newId, `create_checklist returned id: ${newId}`);
  if (newId) {
    const itemRes = await callTool("create_checklist_item", {
      listId: newId,
      text: "Item added via MCP",
    });
    check(itemRes?.result?.content?.[0]?.text.includes("true"), "create_checklist_item ok");
    const del = await callTool("delete_checklist", { listId: newId });
    check(del?.result?.content?.[0]?.text.includes("true"), "delete_checklist ok");
  }

  // search (authenticated)
  const search = await callTool("search", { q: "the", type: "note" });
  const searchData = parseText(search);
  check(Array.isArray(searchData?.results), `search returns results array (len=${searchData?.results?.length})`);

  // error path: bad UUID should be isError
  const bad = await callTool("get_note", { noteId: "not-a-real-uuid-1234" });
  check(bad?.result?.isError === true, "get_note with bad uuid returns isError");

  clearInterval(checkInterval);
  child.stdin.end();
  child.kill();

  console.log("stderr:", stderr.join("").trim() || "(empty)");
  console.log(ok ? "\nINTEGRATION TEST PASSED" : "\nINTEGRATION TEST FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("test crashed:", e);
  process.exit(1);
});