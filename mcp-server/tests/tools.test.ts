import { afterAll, describe, expect, it } from "bun:test";
import { toSpec } from "../src/jotty/spec.ts";
import { builtinTools, runBuiltin } from "../src/tools/builtins.ts";
import { BuiltinTool } from "../src/tools/context.ts";
import { operationTool, runOperation } from "../src/tools/operation.ts";
import { FAKE_SPEC, makeCtx, serveJotty, structured, text } from "./helpers.ts";

const jotty = serveJotty();
const spec = toSpec(FAKE_SPEC);
const op = (id: string) => spec.operations.get(id)!;

afterAll(() => jotty.stop());

describe("runOperation", () => {
  it("sends the API key and returns the response as structured content", async () => {
    const result = await runOperation(makeCtx(jotty.url), spec, op("listNotes"), { q: "milk" });
    expect(result.isError).toBeUndefined();
    expect(structured(result)).toEqual({ notes: [{ id: "n-1", title: "Milk", category: "Uncategorized", content: "" }] });
    expect(jotty.hits.at(-1)).toMatchObject({ method: "GET", path: "/api/notes?q=milk", apiKey: "ck_test" });
  });

  it("posts the flat arguments as the body", async () => {
    await runOperation(makeCtx(jotty.url), spec, op("createNote"), { title: "Milk" });
    expect(jotty.hits.at(-1)).toMatchObject({ method: "POST", path: "/api/notes", body: { title: "Milk" } });
  });

  it("turns a 404 into a not_found error with a hint", async () => {
    const result = await runOperation(makeCtx(jotty.url), spec, op("getNote"), { noteId: "gone" });
    expect(result.isError).toBe(true);
    expect(structured(result).error).toMatchObject({ kind: "not_found", status: 404, message: "Note not found" });
  });

  it("refuses to call without a required path param", async () => {
    const before = jotty.hits.length;
    const result = await runOperation(makeCtx(jotty.url), spec, op("deleteNote"), {});
    expect(structured(result).error).toMatchObject({ kind: "input" });
    expect(jotty.hits.length).toBe(before);
  });

  it("reports a rejected API key as an auth error", async () => {
    const result = await runOperation(makeCtx(jotty.url, "wrong"), spec, op("listNotes"), {});
    expect(structured(result).error).toMatchObject({ kind: "auth", status: 401 });
  });

  it("trims a long list to the rows that fit and says how many are left", async () => {
    const ctx = makeCtx(jotty.url);
    ctx.config.output.maxTextChars = 1_000;
    const result = await runOperation(ctx, spec, op("listNotes"), { q: "many" });
    const data = structured(result);
    expect(text(result).length).toBeLessThanOrEqual(1_000);
    expect((data.notes as unknown[]).length).toBeLessThan(30);
    expect(data.trimmed).toMatchObject({ field: "notes", of: 30 });
  });

  it("says which offset reads the next rows", async () => {
    const ctx = makeCtx(jotty.url);
    ctx.config.output.maxTextChars = 1_000;
    const result = await runOperation(ctx, spec, op("listNotes"), { q: "many", offset: 5 });
    const trimmed = structured(result).trimmed as { shown: number; hint: string };
    expect(trimmed.hint).toContain(`offset=${5 + trimmed.shown}`);
  });

  it("doesn't suggest offset to an operation that can't page", async () => {
    const ctx = makeCtx(jotty.url);
    ctx.config.output.maxTextChars = 1_000;
    const result = await runOperation(ctx, spec, op("listTasks"), {});
    const trimmed = structured(result).trimmed as { hint: string };
    expect(trimmed.hint).not.toContain("offset");
    expect(trimmed.hint).toContain("category");
  });

  it("leaves out the catalog's omitted row fields", async () => {
    const result = await runOperation(makeCtx(jotty.url), spec, op("search"), { q: "milk" }, { curated: true });
    expect(structured(result).results).toEqual([{ uuid: "u-1", slug: "milk", title: "Milk" }]);
  });

  it("points a bad item index at get_checklist", async () => {
    const result = await runOperation(makeCtx(jotty.url), spec, op("checkChecklistItem"), { listId: "l-1", itemIndex: "9" }, { curated: true });
    expect(text(result)).toContain("get_checklist");
  });

  it("uses the catalog's own hint for a refused mention link", async () => {
    const result = await runOperation(makeCtx(jotty.url), spec, op("connectItems"), { source: "n-1", target: "n-2", style: "mention" }, { curated: true });
    expect(text(result)).toContain("Mention not found");
    expect(text(result)).toContain("style=append");
    expect(text(result)).not.toContain("input schema");
  });

  it("cuts an oversized single record and leaves out the structured copy", async () => {
    const ctx = makeCtx(jotty.url);
    ctx.config.output.maxTextChars = 20;
    const result = await runOperation(ctx, spec, op("getNote"), { noteId: "n-1" });
    expect(text(result)).toContain("cut at 20");
    expect(result.structuredContent).toBeUndefined();
  });

  it("lets the caller raise maxChars for one call without sending it to Jotty", async () => {
    const ctx = makeCtx(jotty.url);
    ctx.config.output.maxTextChars = 20;
    const result = await runOperation(ctx, spec, op("getNote"), { noteId: "n-1", maxChars: 5_000 });
    expect(text(result)).not.toContain("cut at");
    expect(structured(result)).toMatchObject({ data: { title: "Milk" } });
    expect(jotty.hits.at(-1)?.path).toBe("/api/notes/n-1");
  });

  it("lets the caller lower maxChars and says how to get the rest", async () => {
    const result = await runOperation(makeCtx(jotty.url), spec, op("getNote"), { noteId: "n-1", maxChars: 30 });
    expect(text(result)).toContain("cut at 30");
    expect(text(result)).toContain("maxChars");
  });

  it("offers maxChars on every tool, defaulting to the server setting", () => {
    const tool = operationTool(spec, op("getNote"), 12_000);
    expect(tool.inputSchema.properties?.maxChars).toMatchObject({ type: "integer", minimum: 1 });
    expect(JSON.stringify(tool.inputSchema.properties?.maxChars)).toContain("12000");
    expect(builtinTools(12_000).find((entry) => entry.name === "call_operation")?.inputSchema.properties?.maxChars).toBeDefined();
  });

  it("applies the catalog defaults to curated tools only", async () => {
    await runOperation(makeCtx(jotty.url), spec, op("listNotes"), {}, { curated: true });
    expect(jotty.hits.at(-1)?.path).toBe("/api/notes?view=summary&limit=25");
    await runOperation(makeCtx(jotty.url), spec, op("listNotes"), {});
    expect(jotty.hits.at(-1)?.path).toBe("/api/notes");
  });

  it("lets the caller override a catalog default", async () => {
    await runOperation(makeCtx(jotty.url), spec, op("listNotes"), { view: "full" }, { curated: true });
    expect(jotty.hits.at(-1)?.path).toBe("/api/notes?view=full&limit=25");
  });

  it("refuses arguments the operation doesn't take", async () => {
    const before = jotty.hits.length;
    const result = await runOperation(makeCtx(jotty.url), spec, op("getNote"), { id: "n-1" });
    expect(structured(result).error).toMatchObject({ kind: "input", message: "Unknown argument id." });
    expect(text(result)).toContain("getNote takes: noteId");
    expect(jotty.hits.length).toBe(before);
  });

  it("names the tool, not the operation, when a curated tool gets a stray argument", async () => {
    const result = await runOperation(makeCtx(jotty.url), spec, op("getNote"), { id: "n-1" }, { curated: true });
    expect(text(result)).toContain("get_note takes: noteId");
  });

  it("hands back a download link instead of fetching a binary file", async () => {
    const before = jotty.hits.length;
    const result = await runOperation(makeCtx(jotty.url), spec, op("downloadExport"), { filename: "a.zip" });
    expect(structured(result)).toMatchObject({ download: `${jotty.url}/api/exports/a.zip`, contentType: "application/zip" });
    expect(jotty.hits.length).toBe(before);
  });

  it("returns only the changed card from curated card tools", async () => {
    const result = await runOperation(makeCtx(jotty.url), spec, op("updateBoardItem"), { boardId: "b-1", itemId: "c-1", text: "x" }, { curated: true });
    expect(structured(result)).toEqual({ success: true, item: { id: "c-1", text: "Write tests", status: "todo" } });
  });
});

describe("builtins", () => {
  it("discover lists operations and which curated tools this instance lacks", async () => {
    const result = await runBuiltin(makeCtx(jotty.url), BuiltinTool.Discover, {});
    const data = structured(result);
    expect(data.version).toBe("9.9.9");
    expect(data.tools).toEqual(["search", "list_notes", "get_note", "create_note", "delete_note", "check_checklist_item", "update_board_item", "assign_agent", "set_board_spec", "get_task_context", "list_agent_tasks", "connect_items", "list_duplicate_uuids"]);
    expect(data.unavailableTools).toContain("list_boards");
  });

  it("discover leaves out the operations dedicated tools cover", async () => {
    const result = await runBuiltin(makeCtx(jotty.url), BuiltinTool.Discover, {});
    const ids = (structured(result).operations as { operationId: string }[]).map((entry) => entry.operationId);
    expect(ids).toEqual(expect.arrayContaining(["listTasks", "downloadExport", "createTaskStatus"]));
    expect(ids).not.toContain("listNotes");
  });

  it("call_operation input errors point at discover", async () => {
    const result = await runBuiltin(makeCtx(jotty.url), BuiltinTool.CallOperation, {
      operationId: "createTaskStatus",
      arguments: { taskId: "bad", body: { label: "x" } },
    });
    expect(text(result)).toContain("Call discover with operationId createTaskStatus");
  });

  it("discover returns one operation's input schema", async () => {
    const result = await runBuiltin(makeCtx(jotty.url), BuiltinTool.Discover, { operationId: "createTaskStatus" });
    expect(structured(result)).toMatchObject({ operationId: "createTaskStatus", inputSchema: { required: ["taskId", "body"] } });
  });

  it("call_operation reaches operations without a dedicated tool", async () => {
    const result = await runBuiltin(makeCtx(jotty.url), BuiltinTool.CallOperation, {
      operationId: "createTaskStatus",
      arguments: { taskId: "t-1", body: { label: "Done" } },
    });
    expect(result.isError).toBeUndefined();
    expect(jotty.hits.at(-1)).toMatchObject({ method: "POST", path: "/api/tasks/t-1/statuses", body: { label: "Done" } });
  });

  it("call_operation refuses unknown operation ids", async () => {
    const result = await runBuiltin(makeCtx(jotty.url), BuiltinTool.CallOperation, { operationId: "dropDatabase" });
    expect(structured(result).error).toMatchObject({ kind: "not_found" });
  });

  it("call_operation honours maxChars", async () => {
    const ctx = makeCtx(jotty.url);
    ctx.config.output.maxTextChars = 20;
    const result = await runBuiltin(ctx, BuiltinTool.CallOperation, { operationId: "getNote", arguments: { noteId: "n-1" }, maxChars: 5_000 });
    expect(text(result)).not.toContain("cut at");
  });

  it("health counts uuids shared by more than one file", async () => {
    const result = await runBuiltin(makeCtx(jotty.url), BuiltinTool.Health, {});
    expect(structured(result)).toMatchObject({ apiKey: "accepted", duplicateUuids: 1 });
    expect(text(result)).toContain("list_duplicate_uuids");
  });

  it("health reports a rejected key without failing", async () => {
    const result = await runBuiltin(makeCtx(jotty.url, "wrong"), BuiltinTool.Health, {});
    expect(structured(result)).toMatchObject({ apiKey: "rejected", operations: 0 });
  });

  describe("on a Jotty without the OpenAPI route", () => {
    const old = serveJotty(null);
    afterAll(() => old.stop());

    it("health names the version problem instead of blaming the key", async () => {
      const result = await runBuiltin(makeCtx(old.url), BuiltinTool.Health, {});
      expect(structured(result)).toMatchObject({ apiKey: "unchecked", upstream: { version: "1.27.0" } });
      expect(text(result)).toContain("needs Jotty 1.28.0 or newer");
    });

    it("call_operation says to update Jotty", async () => {
      const result = await runBuiltin(makeCtx(old.url), BuiltinTool.CallOperation, { operationId: "listNotes" });
      expect(structured(result).error).toMatchObject({ kind: "unsupported" });
      expect(text(result)).toContain("Update Jotty to 1.28.0 or newer");
    });
  });
});
