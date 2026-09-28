import { describe, it, expect } from "vitest";
import { itemLinksTo, retargetLinks, unlinkItem } from "@/app/_utils/item-links";

const T = "aaaaaaaa-1111-4222-8333-944455556666";
const OTHER = "bbbbbbbb-1111-4222-8333-944455556666";
const FRESH = "cccccccc-1111-4222-8333-944455556666";

describe("itemLinksTo", () => {
  it("finds canonical, legacy and same-origin links but not code, images or other items", () => {
    const text = [
      `[Garden](/note/${T}) and [Old](/jotty/${T})`,
      `![pic](/note/${T}) [Else](/note/${OTHER})`,
      "```",
      `[Code](/note/${T})`,
      "```",
      `\`[inline](/note/${T})\` [Abs](https://jotty.example/checklist/${T})`,
    ].join("\n");

    const labels = itemLinksTo(text, T, ["https://jotty.example"]).map((link) => link.label);
    expect(labels).toEqual(["Garden", "Old", "Abs"]);
  });
});

describe("retargetLinks", () => {
  it("rewrites only the href, even when the label holds the uuid", () => {
    const text = `see [${T}](/note/${T})`;
    const moved = retargetLinks(text, itemLinksTo(text, T), T, FRESH);
    expect(moved).toBe(`see [${T}](/note/${FRESH})`);
  });
});

describe("unlinkItem", () => {
  it("removes an appended link and the blank line in front of it", () => {
    const text = `Some text.\n\n[Garden](/note/${T})\n`;
    expect(unlinkItem(text, T)).toEqual({ text: "Some text.\n", removed: 1 });
  });

  it("closes the gap when a link line sits between paragraphs", () => {
    const text = `First.\n\n[Garden](/note/${T})\n\nSecond.`;
    expect(unlinkItem(text, T).text).toBe("First.\n\nSecond.");
  });

  it("removes a legacy link on its own bullet line", () => {
    const text = `- keep\n- [Garden](/jotty/${T})\n- also keep`;
    expect(unlinkItem(text, T).text).toBe("- keep\n- also keep");
  });

  it("turns an inline link back into its words", () => {
    const text = `Read the [Garden \\[plan\\]](/note/${T}) first.`;
    expect(unlinkItem(text, T).text).toBe("Read the Garden \\[plan\\] first.");
  });

  it("keeps CRLF line endings and every other byte", () => {
    const text = `A\r\n\r\n[Garden](/note/${T})\r\n\r\nB [Else](/note/${OTHER})\r\n`;
    expect(unlinkItem(text, T).text).toBe(`A\r\n\r\nB [Else](/note/${OTHER})\r\n`);
  });

  it("removes several links to the same item in one pass", () => {
    const text = `Intro [Garden](/note/${T}).\n\n[Garden](/note/${T})\n[Garden](/jotty/${T})\n`;
    expect(unlinkItem(text, T)).toEqual({ text: "Intro Garden.\n", removed: 3 });
  });

  it("leaves the text alone when nothing links to the item", () => {
    const text = `No [links](/note/${OTHER}) here\n`;
    expect(unlinkItem(text, T)).toEqual({ text, removed: 0 });
  });
});
