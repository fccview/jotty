import { describe, expect, it } from "vitest";
import { normalizeMermaid } from "@/app/_utils/mermaid-utils";

const BODY = "\n    service db(database)[Database]\n";

describe("normalizeMermaid", () => {
  it("upgrades a plain architecture header to architecture-beta", () => {
    expect(normalizeMermaid(`architecture${BODY}`)).toBe(`architecture-beta${BODY}`);
  });

  it("leaves architecture-beta alone", () => {
    expect(normalizeMermaid(`architecture-beta${BODY}`)).toBe(`architecture-beta${BODY}`);
  });

  it("finds the header behind frontmatter, directives and blank lines", () => {
    const head = "---\ntitle: Infra\n---\n%%{init: {}}%%\n\n  ";
    expect(normalizeMermaid(`${head}architecture${BODY}`)).toBe(`${head}architecture-beta${BODY}`);
  });

  it("accepts frontmatter fences with trailing spaces", () => {
    const head = "--- \ntitle: x\n---  \n";
    expect(normalizeMermaid(`${head}architecture${BODY}`)).toBe(`${head}architecture-beta${BODY}`);
  });

  it("skips directives that span several lines", () => {
    const head = "%%{\n  init: {}\n}%%\n";
    expect(normalizeMermaid(`${head}architecture${BODY}`)).toBe(`${head}architecture-beta${BODY}`);
  });

  it("stops at the first frontmatter close instead of reaching into the body", () => {
    const flow = "---\ntitle: a\n---\nflowchart TD\n---\narchitecture\n";
    expect(normalizeMermaid(flow)).toBe(flow);
  });

  it("keeps CRLF line endings working", () => {
    const head = "%% infra\r\n";
    expect(normalizeMermaid(`${head}architecture\r\n  service a(server)[A]`)).toBe(
      `${head}architecture-beta\r\n  service a(server)[A]`
    );
  });

  it("never touches nodes that happen to be called architecture", () => {
    const flow = "flowchart TD\narchitecture --> db\n";
    expect(normalizeMermaid(flow)).toBe(flow);
  });

  it("ignores words that only start with architecture", () => {
    const code = "architectureDiagram\n";
    expect(normalizeMermaid(code)).toBe(code);
  });

  it("leaves sankey for mermaid to handle natively", () => {
    const code = "sankey\nA,B,10\n";
    expect(normalizeMermaid(code)).toBe(code);
  });
});
