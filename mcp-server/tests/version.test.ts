import { describe, expect, it } from "bun:test";
import manifest from "../package.json" with { type: "json" };
import { SERVER_VERSION } from "../src/server/mcp.ts";

const jotty = await Bun.file(new URL("../../package.json", import.meta.url)).json();

describe("version", () => {
  it("matches the Jotty version, so one tag covers both", () => {
    expect(manifest.version).toBe(jotty.version);
  });

  it("is what the server reports", () => {
    expect(SERVER_VERSION).toBe(manifest.version);
  });
});
