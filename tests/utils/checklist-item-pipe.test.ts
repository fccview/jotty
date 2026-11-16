import { describe, it, expect, vi } from "vitest";
import { listToMarkdown, parseMarkdown } from "@/app/_utils/checklist-utils";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";
import { Checklist } from "@/app/_types";
import { ChecklistsTypes } from "@/app/_types/enums";

vi.unmock("@/app/_utils/checklist-utils");

const PIPED = "Alpha | beta gamma";
const MANY_PIPES = "a | b || c |";
const PIPED_NOTE = "see | here";

const list: Checklist = {
  id: "chores",
  uuid: "chores-uuid",
  title: "Chores",
  type: ChecklistsTypes.SIMPLE,
  category: "Uncategorized",
  items: [
    {
      id: "item-1",
      text: PIPED,
      completed: true,
      order: 0,
      description: PIPED_NOTE,
      children: [{ id: "child-1", text: MANY_PIPES, completed: false, order: 0 }],
    },
    { id: "item-2", text: "plain", completed: false, order: 1 },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const parsers = {
  server: (markdown: string) => parseMarkdown(markdown, "chores", "Uncategorized").items,
  client: (markdown: string) => parseChecklistContent(markdown, "chores").items,
};

describe("simple checklist item text with ' | '", () => {
  Object.entries(parsers).forEach(([side, parse]) => {
    it(`survives a save and reload in the ${side} parser`, () => {
      const [first, second] = parse(listToMarkdown(list));

      expect(first).toMatchObject({ id: "item-1", text: PIPED, completed: true, description: PIPED_NOTE });
      expect(first.children?.[0]).toMatchObject({ id: "child-1", text: MANY_PIPES });
      expect(second).toMatchObject({ id: "item-2", text: "plain" });
    });

    it(`stays stable across repeated saves in the ${side} parser`, () => {
      const once = listToMarkdown(list);
      const twice = listToMarkdown({ ...list, items: parse(once) });

      expect(twice).toBe(once);
    });
  });
});
