import { describe, it, expect } from "vitest";
import {
  insertBulletList,
  insertCodeBlock,
  insertOrderedList,
  insertHeading,
  insertMermaid,
  markdownFormatsAt,
  recordMarkdownEdit,
  type MarkdownHistory,
} from "@/app/_utils/markdown-editor-utils";

const CURSOR = "|";

const fakeTextarea = (text: string) => {
  const start = text.indexOf(CURSOR);
  const value = text.replace(CURSOR, "");
  const second = value.indexOf(CURSOR);
  const ta = {
    value: value.replace(CURSOR, ""),
    selectionStart: start,
    selectionEnd: second === -1 ? start : second,
    setSelectionRange(from: number, to: number) {
      ta.selectionStart = from;
      ta.selectionEnd = to;
    },
  };
  return ta as unknown as HTMLTextAreaElement;
};

const withCursor = (ta: HTMLTextAreaElement) => {
  const { value, selectionStart, selectionEnd } = ta;
  if (selectionStart === selectionEnd) return value.slice(0, selectionStart) + CURSOR + value.slice(selectionStart);
  return (
    value.slice(0, selectionStart) +
    CURSOR +
    value.slice(selectionStart, selectionEnd) +
    CURSOR +
    value.slice(selectionEnd)
  );
};

const apply = (text: string, edit: (ta: HTMLTextAreaElement) => string) => {
  const ta = fakeTextarea(text);
  edit(ta);
  return withCursor(ta);
};

describe("markdown toolbar list toggles", () => {
  it.each([
    ["it|em", "- it|em"],
    ["|", "- |"],
    ["- it|em", "it|em"],
    ["-| item", "|item"],
    ["1. it|em", "- it|em"],
    ["one|\ntwo|", "- one|\n- two|"],
  ])("bullet toggles %j to %j", (input, expected) => {
    expect(apply(input, insertBulletList)).toBe(expected);
  });

  it.each([
    ["it|em", "1. it|em"],
    ["1. it|em", "it|em"],
    ["- it|em", "1. it|em"],
    ["a\n|b", "a\n1. |b"],
  ])("ordered toggles %j to %j", (input, expected) => {
    expect(apply(input, insertOrderedList)).toBe(expected);
  });

  it("toggles a heading without moving the caret off its word", () => {
    expect(apply("hel|lo", (ta) => insertHeading(ta, 2))).toBe("## hel|lo");
  });
});

describe("markdown block inserts", () => {
  it.each([
    ["wo|rd", "wo\n```js\n|\n```\nrd"],
    ["|", "```js\n|\n```\n"],
    ["line\n|", "line\n```js\n|\n```\n"],
    ["end|\nnext", "end\n```js\n|\n```\nnext"],
  ])("puts a code fence on its own lines for %j", (input, expected) => {
    expect(apply(input, (ta) => insertCodeBlock(ta, "js"))).toBe(expected);
  });

  it("puts a mermaid fence on its own lines", () => {
    expect(apply("ab|cd", (ta) => insertMermaid(ta, "graph TD"))).toBe("ab\n```mermaid\ngraph TD|\n```\ncd");
  });
});

describe("markdownFormatsAt", () => {
  const at = (text: string) => markdownFormatsAt(text.replace(CURSOR, ""), text.indexOf(CURSOR));

  it("follows the caret line for headings", () => {
    expect(at("## ti|tle\nplain").heading).toBe(2);
    expect(at("## title\npla|in").heading).toBe(0);
  });

  it.each([
    ["**bo|ld** rest", "bold"],
    ["*it|alic* rest", "italic"],
    ["~~st|rike~~", "strike"],
    ["`co|de`", "code"],
    ["<u>un|der</u>", "underline"],
    ["[li|nk](https://x)", "link"],
    ["> quo|te", "blockquote"],
    ["- it|em", "bulletList"],
    ["1. it|em", "orderedList"],
    ["- [ ] ta|sk", "taskList"],
  ] as const)("flags %j as %s", (text, key) => {
    expect(at(text)[key]).toBe(true);
  });

  it("does not flag text outside the markers", () => {
    const formats = at("**bold** pla|in *it* `c`");
    expect(formats.bold || formats.italic || formats.code).toBe(false);
  });

  it("does not read a bullet marker as italic", () => {
    expect(at("* it|em").italic).toBe(false);
  });
});

describe("recordMarkdownEdit", () => {
  const record = (value: string, at: number, timestamp = 1) => ({
    value,
    selectionStart: at,
    selectionEnd: at,
    timestamp,
  });

  it("makes undo land on the pre edit caret", () => {
    const history: MarkdownHistory = { stack: [record("hello", 0)], offset: 0 };
    const top = { offset: 0, record: history.stack[0] };
    history.stack[0] = record("## hello", 8);
    recordMarkdownEdit(history, record("hello", 3, 0), record("## hello", 6, 0), top);
    expect(history.stack.map((entry) => [entry.value, entry.selectionStart])).toEqual([
      ["hello", 3],
      ["## hello", 6],
    ]);
    expect(history.offset).toBe(1);
  });

  it("keeps an unrelated earlier state and drops redo entries", () => {
    const history: MarkdownHistory = {
      stack: [record("a", 1), record("ab", 2), record("abc", 3)],
      offset: 1,
    };
    const top = { offset: 1, record: history.stack[1] };
    recordMarkdownEdit(history, record("abX", 2, 0), record("**abX**", 5, 0), top);
    expect(history.stack.map((entry) => entry.value)).toEqual(["a", "ab", "abX", "**abX**"]);
    expect(history.offset).toBe(3);
  });
});
