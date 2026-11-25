import { describe, it, expect, vi } from "vitest";
import {
  listToMarkdown,
  parseMarkdown,
} from "@/app/_utils/checklist-utils";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";
import { ChecklistsTypes } from "@/app/_types/enums";

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

    it(`${side}: keeps 2 space nesting as before`, () => {
      const markdown = "- [ ] a\n  - [ ] b\n    - [ ] c\n  - [ ] d\n- [ ] e\n";
      expect(shape(parse(markdown))).toEqual([
        ["a", [["b", [["c", []]]], ["d", []]]],
        ["e", []],
      ]);
    });

    it(`${side}: keeps items that dedent to an indent never used`, () => {
      const markdown = "- [ ] a\n    - [ ] b\n  - [ ] c\n- [ ] d\n";
      expect(shape(parse(markdown))).toEqual([
        ["a", [["b", []], ["c", []]]],
        ["d", []],
      ]);
    });

    it(`${side}: keeps items when the first line is indented`, () => {
      const markdown = "  - [ ] a\n    - [ ] b\n  - [ ] c\n";
      expect(shape(parse(markdown))).toEqual([["a", [["b", []]]], ["c", []]]);
    });

    it(`${side}: keeps items that jump more than one level`, () => {
      const markdown = "- [ ] a\n  - [ ] b\n        - [ ] c\n- [ ] d\n";
      expect(shape(parse(markdown))).toEqual([
        ["a", [["b", [["c", []]]]]],
        ["d", []],
      ]);
    });

    it(`${side}: keeps equally indented items as siblings after a jump`, () => {
      const markdown = "- [ ] a\n  - [ ] b\n        - [ ] c\n        - [ ] d\n";
      expect(shape(parse(markdown))).toEqual([
        ["a", [["b", [["c", []], ["d", []]]]]],
      ]);
    });

    it.each([
      ["0 1", "- [ ] a\n - [ ] b\n", [["a", []], ["b", []]]],
      ["0 2 3", "- [ ] a\n  - [ ] b\n   - [ ] c\n", [["a", [["b", []], ["c", []]]]]],
      ["0 2 1", "- [ ] a\n  - [ ] b\n - [ ] c\n", [["a", [["b", []]]], ["c", []]]],
      ["0 3 4", "- [ ] a\n   - [ ] b\n    - [ ] c\n", [["a", [["b", [["c", []]]]]]]],
    ])(`${side}: keeps odd indents %s nested as before`, (_name, markdown, expected) => {
      expect(shape(parse(markdown))).toEqual(expected);
    });
  });

  it("writes tab indented sub-items back nested with 2 spaces", () => {
    const markdown = "# Groceries\n\n- [ ] Fruit\n\t- [ ] apples\n\t\t- [x] green\n";
    const written = listToMarkdown({
      id: "groceries",
      uuid: "groceries-uuid",
      title: "Groceries",
      type: ChecklistsTypes.SIMPLE,
      category: "Uncategorized",
      items: parsers.server(markdown),
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(written).toContain("\n  - [ ] apples");
    expect(written).toContain("\n    - [x] green");
    expect(shape(parsers.server(written))).toEqual(shape(parsers.server(markdown)));
  });
});
