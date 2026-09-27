import { describe, it, expect } from "vitest";
import {
  handleListEnter,
  indentListItem,
} from "@/app/_utils/markdown-editor-utils";

const CURSOR = "|";

const fakeTextarea = (text: string) => {
  const pos = text.indexOf(CURSOR);
  const ta = {
    value: text.replace(CURSOR, ""),
    selectionStart: pos,
    selectionEnd: pos,
    setSelectionRange(start: number, end: number) {
      ta.selectionStart = start;
      ta.selectionEnd = end;
    },
  };
  return ta as unknown as HTMLTextAreaElement;
};

const withCursor = (ta: HTMLTextAreaElement) =>
  ta.value.slice(0, ta.selectionStart) + CURSOR + ta.value.slice(ta.selectionStart);

const pressEnter = (text: string) => {
  const ta = fakeTextarea(text);
  return handleListEnter(ta) === null ? null : withCursor(ta);
};

const pressTab = (text: string) => {
  const ta = fakeTextarea(text);
  return indentListItem(ta) === null ? null : withCursor(ta);
};

describe("markdown list editing", () => {
  describe("handleListEnter", () => {
    it.each([
      ["- a|", "- a\n- |"],
      ["* a|", "* a\n* |"],
      ["+ a|", "+ a\n+ |"],
      ["-   a|", "-   a\n-   |"],
      ["    - sub|", "    - sub\n    - |"],
      ["        * deep|", "        * deep\n        * |"],
      ["1. a|", "1. a\n2. |"],
      ["    9.  sub|", "    9.  sub\n    10.  |"],
      ["- [ ] a|", "- [ ] a\n- [ ] |"],
      ["    - [x] done|", "    - [x] done\n    - [ ] |"],
    ])("should continue %j", (input, expected) => {
      expect(pressEnter(input)).toBe(expected);
    });

    it.each([
      ["- a\n- |", "- a\n|"],
      ["- a\n    - |", "- a\n|"],
      ["1. a\n2. |", "1. a\n|"],
      ["- [ ] a\n- [ ] |", "- [ ] a\n|"],
    ])("should end the list on an empty item %j", (input, expected) => {
      expect(pressEnter(input)).toBe(expected);
    });

    it.each([["plain|"], ["|- a"], ["---|"], ["**bold**|"]])(
      "should leave %j to the default behaviour",
      (input) => {
        expect(pressEnter(input)).toBeNull();
      }
    );
  });

  describe("indentListItem", () => {
    it.each([
      ["- a\n- |", "- a\n    - |"],
      ["- a\n- b|c", "- a\n    - b|c"],
      ["* a\n* |", "* a\n    * |"],
      ["- [ ] a\n- [ ] |", "- [ ] a\n    - [ ] |"],
      ["1. a\n2. |", "1. a\n    1. |"],
      ["1. a\n    1. b\n2. |", "1. a\n    1. b\n    2. |"],
      ["1. a\n    1. b\n        1. c\n2. |", "1. a\n    1. b\n        1. c\n    2. |"],
      ["2. |", "    1. |"],
    ])("should indent the whole item %j", (input, expected) => {
      expect(pressTab(input)).toBe(expected);
    });

    it.each([["plain|"], ["|"], ["text\n|"]])(
      "should leave %j to the default tab",
      (input) => {
        expect(pressTab(input)).toBeNull();
      }
    );

    it("should leave selections to the default tab", () => {
      const ta = fakeTextarea("- a\n- b");
      ta.setSelectionRange(0, 7);
      expect(indentListItem(ta)).toBeNull();
    });
  });
});
