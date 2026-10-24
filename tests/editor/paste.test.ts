// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { Editor } from "@tiptap/core";
import { editAndSave } from "./harness";
import { caretAfter } from "./cursor";
import { looksLikeMarkdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/MarkdownPaste";

const firePaste = (instance: Editor, data: Record<string, string>) => {
  const clipboardData = new DataTransfer();
  Object.entries(data).forEach(([type, value]) => clipboardData.setData(type, value));
  instance.view.dom.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }));
};

const pasteInto = (markdown: string, after: string, text: string) =>
  editAndSave(markdown, (instance) => {
    caretAfter(instance, after);
    firePaste(instance, { "text/plain": text });
  });

describe("pasting plain markdown text", () => {
  it.each([
    ["heading and list", "# Title\n\n- one\n- two"],
    ["task list", "- [ ] todo\n- [x] done"],
    ["ordered list", "1. first\n2. second"],
    ["quote", "> quoted"],
    ["fence", "```js\nconst a = 1;\n```"],
    ["table", "| a   | b   |\n| --- | --- |\n| 1   | 2   |"],
  ])("parses a %s instead of escaping it", (_name, text) => {
    expect(pasteInto("start\n\nend", "end", `\n${text}`)).toBe(`start\n\nend\n\n${text}`);
  });

  it("splits the paragraph when blocks land mid line", () => {
    expect(pasteInto("before after", "before", "\n# Title\n\n- item\n")).toBe("before\n\n# Title\n\n- item\n\nafter");
  });

  it("parses inline bold pasted mid sentence", () => {
    expect(pasteInto("hello world", "hello ", "**big** ")).toBe("hello **big** world");
  });

  it("keeps a single plain line as plain text", () => {
    expect(pasteInto("hello world", "hello ", "brave ")).toBe("hello brave world");
  });

  it("keeps markdown inside a code block literal", () => {
    const saved = pasteInto("```\ncode\n```", "code", "\n# not a heading");
    expect(saved).toBe("```\ncode\n# not a heading\n```");
  });

  it("keeps html paste on the html path", () => {
    const saved = editAndSave("hello", (instance) => {
      caretAfter(instance, "hello");
      firePaste(instance, { "text/plain": "# rich", "text/html": "<p><strong>rich</strong></p>" });
    });
    expect(saved).toBe("hello**rich**");
  });
});

describe("looksLikeMarkdown", () => {
  it.each(["# heading", "- item", "* item", "+ item", "1. item", "> quote", "```", "| a | b |", "some **bold**", "a\nb"])(
    "flags %s",
    (text) => expect(looksLikeMarkdown(text)).toBe(true),
  );

  it.each(["just words", "5 * 3 = 15", "https://example.com", "#hashtag", ""])("leaves %s alone", (text) =>
    expect(looksLikeMarkdown(text)).toBe(false),
  );
});
