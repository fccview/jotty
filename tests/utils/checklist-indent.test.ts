import { describe, it, expect, vi } from "vitest";
import { parseMarkdown } from "@/app/_utils/checklist-utils";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";

vi.unmock("@/app/_utils/checklist-utils");

const parsers = {
  server: (markdown: string) =>
    parseMarkdown(markdown, "groceries", "Uncategorized").items,
  client: (markdown: string) =>
    parseChecklistContent(markdown, "groceries").items,
};

const shape = (items: { text: string; children?: unknown[] }[]): unknown =>
  items.map((i) => [i.text, shape((i.children as typeof items) ?? [])]);

describe("checklist sub-items written with other indents", () => {
  Object.entries(parsers).forEach(([side, parse]) => {
    it.each([
      ["4 spaces", "    "],
      ["a tab", "\t"],
    ])(`${side}: nests sub-items indented with %s`, (_name, indent) => {
      const markdown = `# Groceries\n\n- [ ] Fruit\n${indent}- [ ] apples\n${indent}${indent}- [x] green\n${indent}- [x] pears\n- [ ] Milk\n`;
      expect(shape(parse(markdown))).toEqual([
        [
          "Fruit",
          [
            ["apples", [["green", []]]],
            ["pears", []],
          ],
        ],
        ["Milk", []],
      ]);
    });
  });
});
