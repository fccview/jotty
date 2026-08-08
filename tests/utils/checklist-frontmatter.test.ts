import { describe, it, expect, vi } from "vitest";
import { listToMarkdown, parseMarkdown } from "@/app/_utils/checklist-utils";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";
import { ChecklistsTypes } from "@/app/_types/enums";

vi.unmock("@/app/_utils/checklist-utils");

const SHARED_BOARD = [
  "---",
  "uuid: board-uuid-1",
  "title: Shared Board",
  "checklistType: kanban",
  "tags:",
  "  - work",
  "sharedWith: 'dawid:w, public:r'",
  "---",
  '- [ ] Card one | metadata:{"id":"card-1"}',
].join("\n");

describe("checklist frontmatter round-trip", () => {
  it("keeps sharing and tags when a board is parsed and written back", () => {
    const parsed = parseChecklistContent(SHARED_BOARD, "shared-board");

    expect(parsed.sharedWith).toBe("dawid:w, public:r");
    expect(parsed.tags).toEqual(["work"]);

    const markdown = listToMarkdown({
      id: "shared-board",
      uuid: parsed.uuid!,
      title: parsed.title,
      type: ChecklistsTypes.KANBAN,
      category: "Uncategorized",
      items: parsed.items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: "fccview",
      tags: parsed.tags,
      sharedWith: parsed.sharedWith,
    });

    expect(parseChecklistContent(markdown, "shared-board").sharedWith).toBe(
      "dawid:w, public:r",
    );
    expect(markdown).toContain("work");
  });

  it("carries sharedWith from parseMarkdown into the written file", () => {
    const list = parseMarkdown(
      SHARED_BOARD,
      "shared-board",
      "Uncategorized",
      "fccview",
    );

    expect(list.sharedWith).toBe("dawid:w, public:r");
    expect(listToMarkdown(list)).toContain("sharedWith:");
  });

  it("omits sharedWith for boards that were never shared", () => {
    const plain = [
      "---",
      "uuid: plain-1",
      "title: Plain",
      "---",
      "- [ ] Only card",
    ].join("\n");

    const list = parseMarkdown(plain, "plain", "Uncategorized", "fccview");

    expect(list.sharedWith).toBeUndefined();
    expect(listToMarkdown(list)).not.toContain("sharedWith");
  });
});
