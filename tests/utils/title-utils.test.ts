import { describe, it, expect } from "vitest";
import { leadingHeading, titleOf, UNTITLED } from "@/app/_utils/title-utils";
import { extractTitle } from "@/app/_utils/yaml-metadata-utils";
import { parseChecklistContent, parseNoteContent } from "@/app/_utils/client-parser-utils";

const UUID = "aaaaaaaa-2222-4333-8444-955566667777";
const SLUG = "garden-plan";
const HEADING = "Planting the Spring Garden";
const UNTITLED_FILE = `---\nuuid: ${UUID}\n---\n# ${HEADING}\n\nThis guide explains things.\n\n\`\`\`python\n# not a title\n\`\`\`\n`;

describe("titleOf", () => {
  it("prefers the frontmatter title", () => {
    expect(titleOf({ title: "Stored" }, `# ${HEADING}`, SLUG)).toBe("Stored");
  });

  it("falls back to a leading H1, then to the filename", () => {
    expect(titleOf({}, `\n\n# ${HEADING}\nbody`, SLUG)).toBe(HEADING);
    expect(titleOf({}, "body first\n# Later heading", SLUG)).toBe("garden plan");
    expect(titleOf({}, "", undefined)).toBe(UNTITLED);
  });

  it("ignores blank or non-text titles and keeps numeric ones", () => {
    expect(titleOf({ title: "   " }, "", SLUG)).toBe("garden plan");
    expect(titleOf({ title: 2024 }, "", SLUG)).toBe("2024");
  });

  it("reads CRLF bodies and skips ## headings", () => {
    expect(leadingHeading(`\r\n# ${HEADING}\r\nbody`)).toBe(HEADING);
    expect(leadingHeading("## Section\nbody")).toBeUndefined();
  });
});

describe("every parser agrees on the title", () => {
  it("resolves the same title for a note written without a frontmatter title", () => {
    expect(extractTitle(UNTITLED_FILE, SLUG)).toBe(HEADING);
    expect(parseNoteContent(UNTITLED_FILE, SLUG).title).toBe(HEADING);
  });

  it("resolves checklist titles the same way", () => {
    const list = `---\nuuid: ${UUID}\n---\n# Groceries\n- [ ] milk\n`;
    expect(parseChecklistContent(list, "shopping").title).toBe("Groceries");
    expect(parseChecklistContent("- [ ] milk\n", "weekly-shop").title).toBe("weekly shop");
  });
});
