// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { editAndSave, open } from "./harness";
import { blockRange, caretAfter, positionOf, selectText } from "./cursor";
import { blockTypes, expectStable, findAll, findOne, textOf } from "./properties";

const NOTE = [
  "# Title",
  "first para with **bold**",
  "second para",
  "-   legacy item\n-   two",
  "|a|b|\n|---|---|\n|1|2|",
  "> quote\n> soft line",
  "<details>\n<summary>More</summary>\n\nhidden\n\n</details>",
].join("\n\n");

interface CalloutCommands {
  setCallout: (type: string) => boolean;
}

const blocksOf = (markdown: string) => markdown.split("\n\n");

const HTML_TABLE = "<table>\n  <tbody>\n    <tr>\n      <td>a</td>\n      <td>b</td>\n    </tr>\n  </tbody>\n</table>";

describe("editing a note", () => {
  it("rewrites only the paragraph that was typed into", () => {
    const saved = editAndSave(NOTE, (editor) => {
      caretAfter(editor, "second para");
      editor.commands.insertContent(" and more");
    });
    const expected = blocksOf(NOTE);
    expected[2] = "second para and more";
    expect(saved).toBe(expected.join("\n\n"));
  });

  it("toggles bold on one word", () => {
    const saved = editAndSave(NOTE, (editor) => {
      selectText(editor, "second");
      editor.commands.toggleBold();
    });
    expect(saved).toBe(NOTE.replace("second para", "**second** para"));
  });

  it("escapes typed markdown characters only where they would change meaning", () => {
    const saved = editAndSave("intro", (editor) => {
      caretAfter(editor, "intro");
      editor.commands.insertContent(" 5*3 and __init__ and my_var and C:\\");
    });
    expect(saved).toBe("intro 5*3 and \\_\\_init\\_\\_ and my_var and C:\\");
    expect(textOf(open(saved).json)).toBe("intro 5*3 and __init__ and my_var and C:\\");
  });

  it.each([
    ["markdown", undefined, /^\| +\| +\|\n\| -+ \| -+ \|\n\| +\| +\|$/],
    ["html", "html" as const, /^<table>[\s\S]*<\/table>$/],
  ])("inserts a table written as %s", (_name, syntax, shape) => {
    const saved = editAndSave(
      "intro\n\nend",
      (editor) => {
        caretAfter(editor, "intro");
        editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
      },
      syntax,
    );
    const parts = blocksOf(saved);
    expect(parts[0]).toBe("intro");
    expect(parts[parts.length - 1]).toBe("end");
    const table = saved.slice("intro\n\n".length, -"\n\nend".length);
    expect(table).toMatch(shape);
    const json = open(saved).json;
    expect(findAll(json, "tableHeader")).toHaveLength(2);
    expect(findAll(json, "tableCell")).toHaveLength(2);
    expectStable(saved, syntax);
  });

  it("toggles a task checkbox", () => {
    const saved = editAndSave("intro\n\n- [ ] one\n- [ ] two\n\nafter", (editor) => {
      const resolved = editor.state.doc.resolve(positionOf(editor, "two"));
      const item = resolved.node(resolved.depth - 1);
      expect(item.type.name).toBe("taskItem");
      editor.commands.command(({ tr }) => {
        tr.setNodeMarkup(resolved.before(resolved.depth - 1), undefined, { ...item.attrs, checked: true });
        return true;
      });
    });
    expect(saved).toBe("intro\n\n- [ ] one\n- [x] two\n\nafter");
  });

  it("adds a callout", () => {
    const saved = editAndSave("intro\n\n-   legacy item", (editor) => {
      caretAfter(editor, "intro");
      (editor.commands as unknown as CalloutCommands).setCallout("warning");
    });
    expect(saved.startsWith("intro\n\n")).toBe(true);
    expect(saved.endsWith("-   legacy item")).toBe(true);
    expect(saved).toContain("> [!WARNING]");
    expect(blockTypes(open(saved).json)).toContain("callout");
  });

  it("deletes a block and keeps the rest byte identical", () => {
    const saved = editAndSave(NOTE, (editor) => {
      editor.commands.deleteRange(blockRange(editor, 2));
    });
    const expected = blocksOf(NOTE);
    expected.splice(2, 1);
    expect(saved).toBe(expected.join("\n\n"));
  });

  it("keeps lists apart when a list is inserted between two preserved lists", () => {
    const markdown = "- a\n- b\n\n* c\n* d";
    expect(blockTypes(open(markdown).json).slice(0, 2)).toEqual(["bulletList", "bulletList"]);
    const saved = editAndSave(markdown, (editor) => {
      editor.commands.insertContentAt(blockRange(editor, 1).from, {
        type: "orderedList",
        content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "new" }] }] }],
      });
    });
    expect(saved.startsWith("- a\n- b\n\n")).toBe(true);
    expect(saved.endsWith("\n\n* c\n* d")).toBe(true);
    expect(blockTypes(open(saved).json).slice(0, 3)).toEqual(["bulletList", "orderedList", "bulletList"]);
  });

  it("keeps lists apart when a bullet list is inserted between two preserved lists", () => {
    const markdown = "- a\n- b\n\n* c\n* d";
    const saved = editAndSave(markdown, (editor) => {
      editor.commands.insertContentAt(blockRange(editor, 1).from, {
        type: "bulletList",
        content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "new" }] }] }],
      });
    });
    expect(saved.startsWith("- a\n- b\n\n")).toBe(true);
    expect(saved.endsWith("\n\n* c\n* d")).toBe(true);
    const json = open(saved).json;
    expect(blockTypes(json).slice(0, 3)).toEqual(["bulletList", "bulletList", "bulletList"]);
    expect(findAll(json, "listItem").map(textOf)).toEqual(["a", "b", "new", "c", "d"]);
  });

  it("keeps two lists apart when the paragraph between them is deleted", () => {
    const saved = editAndSave("- a\n- b\n\nbetween\n\n- c\n- d", (editor) => {
      editor.commands.deleteRange(blockRange(editor, 1));
    });
    expect(saved.startsWith("- a\n- b\n\n")).toBe(true);
    expect(blockTypes(open(saved).json).slice(0, 2)).toEqual(["bulletList", "bulletList"]);
    expect(findAll(open(saved).json, "listItem").map(textOf)).toEqual(["a", "b", "c", "d"]);
  });

  it("keeps two ordered lists apart when an ordered list is inserted between them", () => {
    const markdown = "1. a\n\n1) b";
    const saved = editAndSave(markdown, (editor) => {
      editor.commands.insertContentAt(blockRange(editor, 1).from, {
        type: "orderedList",
        content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "new" }] }] }],
      });
    });
    expect(saved.startsWith("1. a\n\n")).toBe(true);
    expect(blockTypes(open(saved).json).slice(0, 3)).toEqual(["orderedList", "orderedList", "orderedList"]);
  });

  it("keeps an html table as html after a cell edit", () => {
    const saved = editAndSave(`intro\n\n${HTML_TABLE}\n\nend`, (editor) => {
      caretAfter(editor, "b");
      editor.commands.insertContent("eta");
    });
    expect(saved.startsWith("intro\n\n<table>")).toBe(true);
    expect(saved.endsWith("</table>\n\nend")).toBe(true);
    expect(findAll(open(saved).json, "tableCell").map(textOf)).toEqual(["a", "beta"]);
  });

  it("writes a raw block edit back verbatim", () => {
    const saved = editAndSave("intro\n\n<div>raw</div>\n\nend", (editor) => {
      const { from } = blockRange(editor, 1);
      editor.commands.command(({ tr }) => {
        tr.setNodeMarkup(from, undefined, { source: "<div>changed</div>" });
        return true;
      });
    });
    expect(saved).toBe("intro\n\n<div>changed</div>\n\nend");
    expect(findOne(open(saved).json, "rawBlock").attrs?.source).toBe("<div>changed</div>");
  });
});
