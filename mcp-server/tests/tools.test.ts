import { afterAll, describe, expect, it } from "bun:test";
import { toSpec } from "../src/jotty/spec.ts";
import { runBuiltin } from "../src/tools/builtins.ts";
import { BuiltinTool } from "../src/tools/context.ts";
import { runOperation } from "../src/tools/operation.ts";
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

  it("truncates long visible text but keeps the full structured result", async () => {
    const ctx = makeCtx(jotty.url);
    ctx.config.output.maxTextChars = 20;
    const result = await runOperation(ctx, spec, op("listNotes"), {});
    expect(text(result)).toContain("truncated");
    expect(structured(result)).toHaveProperty("notes");
  });
});

describe("builtins", () => {
  it("discover lists operations and which curated tools this instance lacks", async () => {
    const result = await runBuiltin(makeCtx(jotty.url), BuiltinTool.Discover, {});
    const data = structured(result);
    expect(data.version).toBe("9.9.9");
    expect(data.tools).toEqual(["list_notes", "get_note", "create_note", "delete_note"]);
    expect(data.unavailableTools).toContain("list_boards");
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

  it("health reports a rejected key without failing", async () => {
    const result = await runBuiltin(makeCtx(jotty.url, "wrong"), BuiltinTool.Health, {});
    expect(structured(result)).toMatchObject({ apiKey: "rejected", operations: 0 });
  });
});
