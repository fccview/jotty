import { describe, it, expect, vi } from "vitest";

vi.unmock("unified");
vi.unmock("unist-util-visit");
vi.unmock("js-beautify");
vi.unmock("@/app/_utils/markdown-utils");

import {
  tripleStarRegex,
  tripleUnderscoreRegex,
} from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/BoldItalicInput";
import { markdownToEditorHtml } from "@/app/_utils/markdown/parse/to-html";
import { serializeDoc } from "@/app/_utils/markdown/serialize";

describe("Bold italic input", () => {
  it.each([
    ["Today is a ***good day***", "good day"],
    ["***start***", "start"],
  ])("should catch %s", (typed, text) => {
    const match = typed.match(tripleStarRegex);
    expect(match?.[match.length - 1]).toBe(text);
  });

  it("should catch the underscore flavour", () => {
    const match = "a ___quiet___".match(tripleUnderscoreRegex);
    expect(match?.[match.length - 1]).toBe("quiet");
  });

  it.each(["**bold**", "*italic*", "***not yet**", "a***glued***"])(
    "should leave %s to the other rules",
    (typed) => {
      expect(typed.match(tripleStarRegex)).toBeNull();
    }
  );

  it("should store bold italic as ***text***", () => {
    expect(
      serializeDoc({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Today is a " },
              { type: "text", marks: [{ type: "bold" }, { type: "italic" }], text: "good day" },
            ],
          },
        ],
      })
    ).toBe("Today is a ***good day***");
  });

  it("should read ***text*** back as bold italic", () => {
    const html = markdownToEditorHtml("Today is a ***good day***");
    expect(html).toMatch(/<(em|strong)><(strong|em)>good day<\/\2><\/\1>/);
    expect(html).toContain("<strong>");
    expect(html).toContain("<em>");
  });
});
