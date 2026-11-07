// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { Editor } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { editAndSave, editor, freshSave, open } from "./harness";
import { caretAfter, positionOf } from "./cursor";
import { expectRoundtrip, findAll } from "./properties";
import { docToMarkdown } from "@/app/_utils/markdown/editor-bridge";
import { typedTagDoc } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/TagInput";
import type { NodeJson } from "@/app/_utils/markdown/serialize/types";

const typeText = (instance: Editor, text: string) => {
  const { view } = instance;
  Array.from(text).forEach((char) => {
    const { from, to } = view.state.selection;
    const handled = view.someProp("handleTextInput", (handler) =>
      handler(view, from, to, char, () => view.state.tr.insertText(char, from, to)),
    );
    if (!handled) view.dispatch(view.state.tr.insertText(char, from, to));
  });
};

const pressEnter = (instance: Editor) => {
  const { view } = instance;
  const event = new KeyboardEvent("keydown", { key: "Enter" });
  return view.someProp("handleKeyDown", (handler) => handler(view, event));
};

const firePaste = (instance: Editor, data: Record<string, string>) => {
  const clipboardData = new DataTransfer();
  Object.entries(data).forEach(([type, value]) => clipboardData.setData(type, value));
  instance.view.dom.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }));
};

const tagsOf = (instance: Editor) =>
  findAll(instance.getJSON() as NodeJson, "tagLink").map((node) => node.attrs?.tag);

const typedInto = (markdown: string, after: string, text: string) =>
  editAndSave(markdown, (instance) => {
    caretAfter(instance, after);
    typeText(instance, text);
  });

describe("typing a hashtag in the rich editor", () => {
  it.each([
    ["a space", " #newtag next", "hello #newtag next"],
    ["punctuation", " #done.", "hello #done."],
    ["a closing paren", " (#aside)", "hello (#aside)"],
  ])("turns the word into a tag on %s", (_name, typed, saved) => {
    const result = editAndSave("hello", (instance) => {
      caretAfter(instance, "hello");
      typeText(instance, typed);
      expect(tagsOf(instance)).toHaveLength(1);
    });
    expect(result).toBe(saved);
  });

  it("turns the word into a tag on enter", () => {
    const saved = editAndSave("hello", (instance) => {
      caretAfter(instance, "hello");
      typeText(instance, " #todo");
      pressEnter(instance);
      typeText(instance, "next");
      expect(tagsOf(instance)).toEqual(["todo"]);
    });
    expect(saved).toBe("hello #todo\n\nnext");
  });

  it("turns a word typed after a line break into a tag", () => {
    const saved = editAndSave("line one", (instance) => {
      caretAfter(instance, "line one");
      instance.commands.setHardBreak();
      typeText(instance, "#todo next");
      expect(tagsOf(instance)).toEqual(["todo"]);
    });
    expect(saved).not.toContain("\\#");
    expect(saved).toContain("#todo next");
  });

  it("turns the word back into a tag after undoing the conversion", () => {
    const saved = editAndSave("first\n\nsecond", (instance) => {
      caretAfter(instance, "first");
      instance.view.dispatch(closeHistory(instance.state.tr));
      typeText(instance, " #foo");
      instance.view.dispatch(closeHistory(instance.state.tr));
      typeText(instance, " ");
      expect(tagsOf(instance)).toEqual(["foo"]);
      instance.commands.undo();
      expect(tagsOf(instance)).toEqual([]);
      caretAfter(instance, "second");
      expect(tagsOf(instance)).toEqual(["foo"]);
    });
    expect(saved).not.toContain("\\#foo");
    expect(saved).toContain("#foo");
  });

  it("turns the word into a tag when the caret moves away", () => {
    const saved = editAndSave("first\n\nsecond", (instance) => {
      caretAfter(instance, "first");
      typeText(instance, " #later");
      caretAfter(instance, "second");
      expect(tagsOf(instance)).toEqual(["later"]);
    });
    expect(saved).toBe("first #later\n\nsecond");
  });

  it("saves a word still being typed as a tag without touching the document", () => {
    open("note");
    const instance = editor();
    caretAfter(instance, "note");
    typeText(instance, " #wip");
    expect(tagsOf(instance)).toEqual([]);
    expect(docToMarkdown(typedTagDoc(instance.state), null)).toBe("note #wip");
    expect(docToMarkdown(instance.state.doc, null)).toBe("note \\#wip");
  });

  it("keeps the word as text while the caret is still inside it", () => {
    open("note");
    const instance = editor();
    caretAfter(instance, "note");
    typeText(instance, " #draft");
    instance.commands.setTextSelection(positionOf(instance, "#draft") + 3);
    expect(tagsOf(instance)).toEqual([]);
  });

  it("picks a suggestion without leaving a second tag behind", () => {
    const saved = editAndSave("hello", (instance) => {
      caretAfter(instance, "hello");
      typeText(instance, " #wor");
      const from = positionOf(instance, "#wor");
      instance
        .chain()
        .deleteRange({ from, to: from + 4 })
        .insertContent({ type: "tagLink", attrs: { tag: "work" } })
        .run();
      typeText(instance, " more");
      expect(tagsOf(instance)).toEqual(["work"]);
    });
    expect(saved).toBe("hello #work more");
  });

  it("leaves a tag with an empty nesting level as text", () => {
    expect(typedInto("hello", "hello", " #work/ x")).toBe("hello \\#work/ x");
  });

  it.each([
    ["glued to a word", "a#b ", "helloa#b  world"],
    ["a number", " #1 ", "hello #1  world"],
    ["a word running into accents", " #café ", "hello \\#café  world"],
  ])("leaves a hash %s as text", (_name, typed, saved) => {
    expect(typedInto("hello  world", "hello", typed)).toBe(saved);
  });

  it("leaves hashes inside code blocks alone", () => {
    expect(typedInto("```\ncode\n```", "code", " #nope ")).toBe("```\ncode #nope \n```");
  });

  it("leaves hashes inside link text alone", () => {
    const saved = typedInto("[label](https://example.com)", "label", " #nope ");
    expect(saved).toBe("[label #nope ](https://example.com)");
  });
});

describe("escaped hashes in the rich editor", () => {
  it("keeps an escaped hash escaped after an edit", () => {
    const saved = editAndSave("plain \\#escaped\n\nother", (instance) => {
      caretAfter(instance, "other");
      typeText(instance, "!");
    });
    expect(saved).toBe("plain \\#escaped\n\nother!");
  });

  it("keeps an escaped hash escaped when the line itself is edited", () => {
    expect(typedInto("plain \\#escaped", "plain", " text")).toBe("plain text \\#escaped");
  });

  it("does not turn an escaped hash into a tag when the caret passes through it", () => {
    const saved = editAndSave("plain \\#escaped\n\nother", (instance) => {
      caretAfter(instance, "#escaped");
      typeText(instance, " ");
      caretAfter(instance, "other");
      expect(tagsOf(instance)).toEqual([]);
    });
    expect(saved).toBe("plain \\#escaped \n\nother");
  });

  it("does not turn an escaped hash into a tag when the word itself is edited", () => {
    const saved = editAndSave("plain \\#escaped\n\nother", (instance) => {
      caretAfter(instance, "#escaped");
      typeText(instance, "s");
      caretAfter(instance, "other");
      expect(tagsOf(instance)).toEqual([]);
    });
    expect(saved).toBe("plain \\#escapeds\n\nother");
  });

  it.each([
    "plain \\#escaped",
    "**\\#bold** and _\\#italic_",
    "a #real tag and \\#fake one",
    "C# and #1 and a#b",
  ])("round trips %s", (markdown) => {
    expectRoundtrip(markdown);
  });

  it("keeps hashtags in legacy html notes as tags", () => {
    const { json } = open("<p>legacy #old and C# and <code>#code</code></p>");
    expect(findAll(json, "tagLink").map((node) => node.attrs?.tag)).toEqual(["old"]);
    expect(freshSave("<p>legacy #old and C#</p>")).toBe("legacy #old and C#");
  });

  it("keeps a hashtag after a line break in legacy html notes as a tag", () => {
    const saved = freshSave("<p>a<br>#tag</p>");
    expect(saved).not.toContain("\\#");
    expect(saved).toContain("#tag");
  });

  it("reads a tag first inside bold as a bold tag", () => {
    const { json } = open("**#inside** text");
    expect(findAll(json, "tagLink").map((node) => node.attrs?.tag)).toEqual(["inside"]);
    expect(freshSave("**#inside** text")).toBe("**#inside** text");
  });
});

describe("pasting hashtags", () => {
  const pasteInto = (markdown: string, after: string, data: Record<string, string>) =>
    editAndSave(markdown, (instance) => {
      caretAfter(instance, after);
      firePaste(instance, data);
    });

  it("turns hashtags in pasted prose into tags", () => {
    const saved = pasteInto("start", "start", { "text/plain": " see #pasted and #more." });
    expect(saved).toBe("start see #pasted and #more.");
    expect(tagsOf(editor())).toEqual(["pasted", "more"]);
  });

  it("turns hashtags in pasted html into tags", () => {
    const saved = pasteInto("start", "start", { "text/plain": "x", "text/html": "<p>from the web #clipped</p>" });
    expect(tagsOf(editor())).toEqual(["clipped"]);
    expect(saved).toContain("#clipped");
  });

  it("keeps escapes in pasted markdown", () => {
    const saved = pasteInto("start", "start", { "text/plain": "\n- \\#kept and #real" });
    expect(saved).toBe("start\n\n- \\#kept and #real");
    expect(tagsOf(editor())).toEqual(["real"]);
  });

  it("turns hashtags into tags when markdown looking text is pasted as plain text", () => {
    const saved = editAndSave("start", (instance) => {
      caretAfter(instance, "start");
      instance.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", keyCode: 16, shiftKey: true }));
      firePaste(instance, { "text/plain": " **plain** #todo" });
      instance.view.dom.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", keyCode: 16 }));
      expect(tagsOf(instance)).toEqual(["todo"]);
    });
    expect(saved).toBe("start **plain** #todo");
  });

  it("leaves hashes glued to the text before the paste alone", () => {
    expect(pasteInto("start", "start", { "text/plain": "#glued" })).toBe("start#glued");
  });

  it("leaves hashes pasted into code blocks alone", () => {
    expect(pasteInto("```\ncode\n```", "code", { "text/plain": " #nope" })).toBe("```\ncode #nope\n```");
  });
});
