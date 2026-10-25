import { describe, it, expect, vi } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import type { Root, RootContent } from "mdast";
import { remarkSoftBreaks } from "@/app/_utils/markdown/remark-soft-breaks";

vi.unmock("unified");
vi.unmock("remark-parse");

const parsed = (markdown: string): Root => {
  const processor = unified().use(remarkParse).use(remarkSoftBreaks);
  return processor.runSync(processor.parse(markdown)) as Root;
};

const kinds = (node: RootContent) =>
  "children" in node ? node.children.map((child) => child.type) : [];

describe("remarkSoftBreaks", () => {
  it("keeps every typed line on its own line, like the editor shows it", () => {
    const [paragraph] = parsed("test\nhere\nnow").children;
    expect(kinds(paragraph)).toEqual(["text", "break", "text", "break", "text"]);
  });

  it("leaves code blocks exactly as written", () => {
    const [code] = parsed("```\ntest\nhere\n```").children;
    expect(code).toMatchObject({ type: "code", value: "test\nhere" });
  });

  it("still splits paragraphs on a blank line", () => {
    expect(parsed("one\n\ntwo").children.map((node) => node.type)).toEqual(["paragraph", "paragraph"]);
  });

  it("keeps a callout's text on the line after its marker without a break", () => {
    const [quote] = parsed("> [!NOTE]\n> The tables use Mac keys.\n> Second line").children;
    const [paragraph] = "children" in quote ? quote.children : [];
    expect(kinds(paragraph)).toEqual(["text", "break", "text"]);
    expect("children" in paragraph && paragraph.children[0]).toMatchObject({ value: "[!NOTE]\nThe tables use Mac keys." });
  });

  it("still breaks after callout-looking text that isn't at the start of a quote", () => {
    const [paragraph] = parsed("[!NOTE]\nhere").children;
    expect(kinds(paragraph)).toEqual(["text", "break", "text"]);
  });
});
