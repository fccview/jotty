import { describe, expect, it } from "bun:test";
import { runBuiltin } from "../src/tools/builtins.ts";
import { BuiltinTool } from "../src/tools/context.ts";
import { GuideId } from "../src/tools/guides.ts";
import { afterAll } from "bun:test";
import { makeCtx, serveJotty, structured, text } from "./helpers.ts";

const ctx = makeCtx("http://127.0.0.1:9");

describe("mcp_docs", () => {
  it("lists the guides without touching Jotty", async () => {
    const result = await runBuiltin(ctx, BuiltinTool.McpDocs, {});
    expect(structured(result).guides).toEqual([
      { id: GuideId.Tools, title: "MCP tools" },
      { id: GuideId.Agents, title: "Coordinating agents" },
    ]);
  });

  it("returns a whole guide as markdown", async () => {
    const result = await runBuiltin(ctx, BuiltinTool.McpDocs, { docId: GuideId.Agents });
    expect(text(result).startsWith("# Coordinating agents")).toBe(true);
    expect(structured(result).nextOffset).toBeUndefined();
  });

  it("reads a long guide in slices", async () => {
    const first = await runBuiltin(ctx, BuiltinTool.McpDocs, { docId: GuideId.Tools, limit: 100 });
    expect(structured(first).nextOffset).toBe(100);
    expect(text(first)).toContain("pass offset=100");

    const length = structured(first).contentLength as number;
    const last = await runBuiltin(ctx, BuiltinTool.McpDocs, { docId: GuideId.Tools, offset: length - 10 });
    expect(structured(last).nextOffset).toBeUndefined();
  });

  it("names the guides when asked for one that doesn't exist", async () => {
    const result = await runBuiltin(ctx, BuiltinTool.McpDocs, { docId: "mcp-agents" });
    expect(structured(result).error).toMatchObject({ kind: "not_found" });
    expect(text(result)).toContain("tools and agents");
  });
});

describe("jotty_docs", () => {
  const jotty = serveJotty();
  afterAll(() => jotty.stop());

  it("lists Jotty's guides", async () => {
    const result = await runBuiltin(makeCtx(jotty.url), BuiltinTool.JottyDocs, {});
    expect(structured(result)).toMatchObject({ docs: [{ id: "api", title: "API" }] });
    expect(jotty.hits.at(-1)?.path).toBe("/api/howto");
  });

  it("reads one, passing the slice through", async () => {
    const result = await runBuiltin(makeCtx(jotty.url), BuiltinTool.JottyDocs, { docId: "api", offset: 0, limit: 50 });
    expect(structured(result)).toMatchObject({ id: "api", content: "# API" });
    expect(jotty.hits.at(-1)?.path).toBe("/api/howto/api?offset=0&limit=50");
  });

  it("says when a guide doesn't exist", async () => {
    const result = await runBuiltin(makeCtx(jotty.url), BuiltinTool.JottyDocs, { docId: "agents" });
    expect(structured(result).error).toMatchObject({ kind: "not_found" });
  });
});
