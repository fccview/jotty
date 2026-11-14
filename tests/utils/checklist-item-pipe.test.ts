import { describe, it, expect, vi } from "vitest";
import { listToMarkdown, parseMarkdown } from "@/app/_utils/checklist-utils";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";
import { Checklist } from "@/app/_types";

vi.unmock("@/app/_utils/checklist-utils");

describe("simple checklist item text with ' | '", () => {
  const list = {
    id: "chores",
    uuid: "chores-uuid",
    title: "Chores",
    type: "simple",
    items: [{ id: "item-1", text: "Alpha | beta gamma", completed: false, order: 0 }],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as Checklist;

  it("survives a save and reload on the server", () => {
    const parsed = parseMarkdown(listToMarkdown(list), "chores", "Uncategorized");
    expect(parsed.items[0].text).toBe("Alpha | beta gamma");
  });

  it("survives a save and reload in the client parser", () => {
    const { items } = parseChecklistContent(listToMarkdown(list), "chores");
    expect(items[0].text).toBe("Alpha | beta gamma");
  });
});
