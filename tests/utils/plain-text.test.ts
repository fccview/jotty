import { describe, it, expect } from "vitest";
import { CARD_PLAIN_RULES, EXCERPT_PLAIN_RULES, stripMarkdown } from "@/app/_utils/markdown/plain-text";

describe("plain text previews", () => {
  it.each([
    ["card", CARD_PLAIN_RULES],
    ["excerpt", EXCERPT_PLAIN_RULES],
  ])("shows escaped characters without their backslash in %s previews", (_name, rules) => {
    const text = stripMarkdown("plain \\#escaped and \\*kept\\* *bold* \\_under\\_", rules);
    expect(text).toContain("plain #escaped");
    expect(text).toContain("*kept*");
    expect(text).toContain("_under_");
    expect(text).not.toContain("\\");
    expect(text).not.toContain("*bold*");
  });

  it("keeps an escaped hash at the start of a line instead of treating it as a heading", () => {
    expect(stripMarkdown("\\# not a heading", CARD_PLAIN_RULES)).toBe("# not a heading");
  });
});
