/*
 * Live MCP lifecycle test against a real Jotty instance.
 *
 * Drives the actual jotty-mcp tools (MCP Client -> stdio server -> Jotty REST API):
 *   - health, summary, categories, search (reads)
 *   - note: create -> update -> get -> delete
 *   - checklist: create -> add item -> edit item -> check -> uncheck -> delete
 *   - kanban board: create -> add item -> move status -> assign -> reminder -> delete
 *
 * Everything created here is deleted at the end so the test account is left clean.
 *
 * Env: JOTTY_URL, JOTTY_API_KEY
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const serverPath = join(here, "..", "dist", "index.js");

const jottyUrl = process.env.JOTTY_URL;
const apiKey = process.env.JOTTY_API_KEY;
if (!jottyUrl || !apiKey) {
  console.error("JOTTY_URL and JOTTY_API_KEY are required");
  process.exit(2);
}

const created = { notes: [], checklists: [], boards: [] };
let ok = true;
const check = (cond, msg) => {
  if (!cond) {
    ok = false;
    console.error("  FAIL:", msg);
  } else {
    console.log("  ok:", msg);
  }
};

const transport = new StdioClientTransport({
  command: "node",
  args: [serverPath],
  env: {
    ...process.env,
    JOTTY_URL: jottyUrl,
    JOTTY_API_KEY: apiKey,
  },
});
const client = new Client({ name: "live-lifecycle-test", version: "1.0.0" });

const tool = async (name, args) => {
  const res = await client.callTool({ name, arguments: args ?? {} });
  const text = res.content?.[0]?.text;
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-json */
  }
  return { isError: res.isError === true, data, raw: text };
};

async function main() {
  await client.connect(transport);
  check(true, "connected to jotty-mcp over stdio");

  console.log("\n== reads ==");
  const health = await tool("health");
  check(health.data?.status === "healthy", `health => ${health.data?.status} v${health.data?.version}`);

  const summary = await tool("get_summary");
  const before = {
    notes: summary.data?.summary?.notes?.total,
    lists: summary.data?.summary?.checklists?.total,
  };
  check(typeof before.notes === "number", `summary before => notes=${before.notes} checklists=${before.lists}`);

  const cats = await tool("list_categories");
  check(!!cats.data?.categories, "list_categories ok");

  const me = await tool("get_current_user");
  check(!!me.data?.user?.username, `get_current_user => "${me.data?.user?.username}"`);
  check(me.data?.user?.apiKey === undefined, "get_current_user does not leak apiKey");

  console.log("\n== note lifecycle ==");
  const createdNote = await tool("create_note", {
    title: "MCP Test Note",
    content: "# Created via MCP\n\nThis note was created by the jotty-mcp lifecycle test.",
    category: "MCP-Test",
  });
  const noteId = createdNote.data?.data?.id;
  check(!!noteId, `create_note => id ${noteId}`);
  created.notes.push(noteId);

  const updatedNote = await tool("update_note", {
    noteId,
    title: "MCP Test Note (edited)",
    content: "# Edited via MCP\n\nContent was updated. Adds a [searchable-token](link).",
  });
  check(updatedNote.data?.data?.title?.includes("edited"), `update_note => "${updatedNote.data?.data?.title}"`);

  const gotNote = await tool("get_note", { noteId });
  check(
    gotNote.data?.data?.content?.includes("Edited via MCP"),
    "get_note returns updated content",
  );

  const noteSearch = await tool("search", { q: "searchable-token", type: "note" });
  check(
    (noteSearch.data?.results ?? []).some((r) => r.uuid === noteId || r.id === noteId),
    "search finds the note by content",
  );

  console.log("\n== checklist lifecycle ==");
  const createdList = await tool("create_checklist", {
    title: "MCP Test Checklist",
    category: "MCP-Test",
    type: "simple",
  });
  const listId = createdList.data?.data?.id;
  check(!!listId, `create_checklist => id ${listId}`);
  created.checklists.push(listId);

  const item1 = await tool("create_checklist_item", {
    listId,
    text: "First item — created via MCP",
  });
  check(item1.data?.success === true, "create_checklist_item #1");

  const item2 = await tool("create_checklist_item", {
    listId,
    text: "Second item",
  });
  check(item2.data?.success === true, "create_checklist_item #2");

  const editItem = await tool("update_checklist_item", {
    listId,
    itemIndex: "0",
    text: "First item — EDITED via MCP",
    priority: "high",
  });
  check(editItem.data?.success === true, "update_checklist_item (text + priority)");

  const checkIt = await tool("check_item", { listId, itemIndex: "1" });
  check(checkIt.data?.success === true, "check_item #2");

  const listsNow = await tool("list_checklists", { category: "MCP-Test" });
  const ourList = (listsNow.data?.checklists ?? []).find((l) => l.id === listId);
  check(!!ourList, "list_checklists (filtered) returns the new list");
  check(ourList?.items?.length === 2, `list has 2 items (got ${ourList?.items?.length})`);
  check(ourList?.items?.[1]?.completed === true, "item #2 is completed after check_item");

  const uncheckIt = await tool("uncheck_item", { listId, itemIndex: "1" });
  check(uncheckIt.data?.success === true, "uncheck_item #2");

  console.log("\n== kanban board lifecycle ==");
  const createdBoard = await tool("create_board", {
    title: "MCP Test Board",
    category: "MCP-Test",
    statuses: [
      { id: "todo", label: "To Do", order: 0 },
      { id: "doing", label: "Doing", order: 1, color: "#3b82f6" },
      { id: "done", label: "Done", order: 2 },
    ],
  });
  const boardId = createdBoard.data?.data?.id;
  check(!!boardId, `create_board => id ${boardId}`);
  created.boards.push(boardId);

  const boardItem = await tool("create_board_item", {
    boardId,
    text: "Task A",
    status: "todo",
    description: "Created via MCP",
  });
  const itemId = boardItem.data?.data?.id;
  check(!!itemId, `create_board_item => id ${itemId}`);

  const moved = await tool("move_board_item", { boardId, itemId, status: "doing" });
  check(moved.data?.success === true, "move_board_item todo -> doing");

  const assigned = await tool("assign_board_item", { boardId, itemId, assignee: "" });
  check(assigned.data?.success === true, "assign_board_item (clear)");

  const reminder = await tool("set_board_item_reminder", {
    boardId,
    itemId,
    datetime: "2099-01-01T09:00:00.000Z",
  });
  check(reminder.data?.success === true, "set_board_item_reminder");

  const gotBoard = await tool("get_board", { boardId });
  const bItem = (gotBoard.data?.board?.items ?? []).find((i) => i.id === itemId);
  check(bItem?.status === "doing", `get_board shows item moved to doing`);
  check(!!bItem?.reminder?.datetime, "get_board shows reminder set");

  const clearReminder = await tool("clear_board_item_reminder", { boardId, itemId });
  check(clearReminder.data?.success === true, "clear_board_item_reminder");

  console.log("\n== summary after ==");
  const summary2 = await tool("get_summary");
  const after = {
    notes: summary2.data?.summary?.notes?.total,
    lists: summary2.data?.summary?.checklists?.total,
  };
  check(after.notes === before.notes + 1, `notes total went ${before.notes} -> ${after.notes}`);
  // The simple checklist AND the kanban board both count as checklists.
  check(after.lists === before.lists + 2, `checklists total went ${before.lists} -> ${after.lists} (+1 list, +1 board)`);

  console.log("\n== cleanup ==");
  for (const id of created.boards) {
    const r = await tool("delete_board", { boardId: id });
    check(r.data?.success === true, `delete_board ${id}`);
  }
  for (const id of created.checklists) {
    const r = await tool("delete_checklist", { listId: id });
    check(r.data?.success === true, `delete_checklist ${id}`);
  }
  for (const id of created.notes) {
    const r = await tool("delete_note", { noteId: id });
    check(r.data?.success === true, `delete_note ${id}`);
  }

  const summary3 = await tool("get_summary");
  const finalCounts = {
    notes: summary3.data?.summary?.notes?.total,
    lists: summary3.data?.summary?.checklists?.total,
  };
  check(finalCounts.notes === before.notes, `notes restored to ${before.notes}`);
  check(finalCounts.lists === before.lists, `checklists restored to ${before.lists}`);

  console.log(ok ? "\nLIVE LIFECYCLE TEST PASSED" : "\nLIVE LIFECYCLE TEST FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error("test crashed:", e);
  // best-effort cleanup even on crash
  for (const id of created.boards) await tool("delete_board", { boardId: id }).catch(() => {});
  for (const id of created.checklists) await tool("delete_checklist", { listId: id }).catch(() => {});
  for (const id of created.notes) await tool("delete_note", { noteId: id }).catch(() => {});
  process.exit(1);
});