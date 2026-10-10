// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";
import { editAndSave, open } from "./harness";
import { findAll } from "./properties";

const RAW_BLOCK = "</div>";
const MERMAID = "```mermaid\ngraph TD\n  A --> B\n```";

const selectFirst = (instance: Editor, type: string) => {
  let found = -1;
  instance.state.doc.descendants((node, pos) => {
    if (found !== -1) return false;
    if (node.type.name === type) found = pos;
  });
  expect(found, `expected a ${type} node`).not.toBe(-1);
  instance.view.dispatch(instance.state.tr.setSelection(NodeSelection.create(instance.state.doc, found)));
  expect(instance.state.selection).toBeInstanceOf(NodeSelection);
};

const typeText = (instance: Editor, text: string) => {
  const { view } = instance;
  const { from, to } = view.state.selection;
  const handled = view.someProp("handleTextInput", (handler) =>
    handler(view, from, to, text, () => view.state.tr.insertText(text, from, to)),
  );
  if (!handled) view.dispatch(view.state.tr.insertText(text, from, to));
};

const pressKey = (instance: Editor, key: string) => {
  const { view } = instance;
  const event = new KeyboardEvent("keydown", { key });
  return view.someProp("handleKeyDown", (handler) => handler(view, event));
};

describe("typing over a selected atom", () => {
  it("keeps a raw block and types after it", () => {
    const markdown = `before\n\n${RAW_BLOCK}\n\nafter`;
    expect(findAll(open(markdown).json, "rawBlock")).toHaveLength(1);
    const saved = editAndSave(markdown, (instance) => {
      selectFirst(instance, "rawBlock");
      typeText(instance, "X");
    });
    expect(saved).toContain(RAW_BLOCK);
    expect(saved).toContain("X");
    expect(saved.indexOf("X")).toBeGreaterThan(saved.indexOf(RAW_BLOCK));
  });

  it("keeps a raw block when Enter is pressed on it", () => {
    const markdown = `${RAW_BLOCK}\n\nafter`;
    const saved = editAndSave(markdown, (instance) => {
      selectFirst(instance, "rawBlock");
      expect(pressKey(instance, "Enter")).toBe(true);
      typeText(instance, "Y");
    });
    expect(saved).toContain(RAW_BLOCK);
    expect(saved.indexOf("Y")).toBeGreaterThan(saved.indexOf(RAW_BLOCK));
  });

  it("keeps a mermaid diagram and types after it", () => {
    const saved = editAndSave(MERMAID, (instance) => {
      selectFirst(instance, "mermaid");
      typeText(instance, "Z");
    });
    expect(saved).toContain(MERMAID);
    expect(saved.trim().endsWith("Z")).toBe(true);
  });

  it("keeps a raw inline node and types after it", () => {
    const markdown = "a <ins>b</ins> c";
    expect(findAll(open(markdown).json, "rawInline")).toHaveLength(2);
    const saved = editAndSave(markdown, (instance) => {
      selectFirst(instance, "rawInline");
      typeText(instance, "Q");
    });
    expect(saved).toBe("a <ins>Qb</ins> c");
  });

  it("still deletes a selected raw block on Backspace", () => {
    const saved = editAndSave(`${RAW_BLOCK}\n\nafter`, (instance) => {
      selectFirst(instance, "rawBlock");
      instance.commands.deleteSelection();
    });
    expect(saved).not.toContain(RAW_BLOCK);
  });
});
