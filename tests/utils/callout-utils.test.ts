import { describe, it, expect, vi } from "vitest";

vi.unmock("unified");
vi.unmock("unist-util-visit");
vi.unmock("js-beautify");
vi.unmock("@/app/_utils/markdown-utils");

import { matchCallout } from "@/app/_utils/callout-utils";
import { markdownToEditorHtml } from "@/app/_utils/markdown/parse/to-html";

describe("Callout Utils", () => {
  describe("matchCallout", () => {
    it.each([
      ["INFO", "info"],
      ["WARNING", "warning"],
      ["SUCCESS", "success"],
      ["DANGER", "danger"],
    ])("should keep reading jotty's own [!%s]", (marker, type) => {
      expect(matchCallout(`[!${marker}] hello`)?.type).toBe(type);
    });

    it.each([
      ["NOTE", "info"],
      ["TIP", "success"],
      ["IMPORTANT", "warning"],
      ["CAUTION", "danger"],
    ])("should map github's [!%s] to %s", (marker, type) => {
      expect(matchCallout(`[!${marker}]`)?.type).toBe(type);
    });

    it("should ignore case", () => {
      expect(matchCallout("[!note]")?.type).toBe("info");
      expect(matchCallout("[!Danger]")?.type).toBe("danger");
    });

    it("should return the marker with trailing whitespace", () => {
      expect(matchCallout("[!TIP]  rest")?.marker).toBe("[!TIP]  ");
    });

    it("should refuse unknown or partial markers", () => {
      expect(matchCallout("[!INFORMATION]")).toBeNull();
      expect(matchCallout("[!BANANA]")).toBeNull();
      expect(matchCallout("text [!INFO]")).toBeNull();
      expect(matchCallout("[INFO]")).toBeNull();
    });
  });

  describe("markdownToEditorHtml", () => {
    it("should render a legacy [!INFO] callout", () => {
      const html = markdownToEditorHtml("> [!INFO]\n> Old style");
      expect(html).toContain('data-callout-type="info"');
      expect(html).toContain("Old style");
      expect(html).not.toContain("[!INFO]");
    });

    it("should render a github [!CAUTION] callout as danger", () => {
      const html = markdownToEditorHtml("> [!CAUTION]\n> Mind the gap");
      expect(html).toContain('data-callout-type="danger"');
      expect(html).not.toContain("[!CAUTION]");
    });

    it("should leave a plain blockquote alone", () => {
      const html = markdownToEditorHtml("> just a quote");
      expect(html).toContain("<blockquote>");
      expect(html).not.toContain("callout");
    });
  });
});
