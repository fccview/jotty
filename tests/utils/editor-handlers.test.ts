import { expect, it, vi } from "vitest";
import { createPasteHandler } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/EditorUtils/editorHandlers";
import type { Editor } from "@tiptap/react";
import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";

const imageFile = new File(["image"], "image.png", { type: "image/png" });
const imageItem = {
  kind: "file",
  type: "image/png",
  getAsFile: vi.fn().mockReturnValue(imageFile),
};

it.each([
  {
    name: "leaves paste unchanged when the preference is disabled",
    enabled: false,
    items: [],
    text: "formatted text",
    expectedText: null,
    uploadsImage: false,
  },
  {
    name: "pastes plain text when the preference is enabled",
    enabled: true,
    items: [],
    text: "first line\n  second line",
    expectedText: "first line\n  second line",
    uploadsImage: false,
  },
  {
    name: "keeps standalone image upload behavior",
    enabled: true,
    items: [imageItem],
    text: "",
    expectedText: null,
    uploadsImage: true,
  },
])("$name", ({ enabled, items, text, expectedText, uploadsImage }) => {
  const pasteText = vi.fn().mockReturnValue(true);
  const upload = vi.fn().mockResolvedValue(undefined);
  const preventDefault = vi.fn();
  const handler = createPasteHandler({} as Editor, upload, enabled);

  const handled = handler(
    { pasteText },
    {
      clipboardData: {
        items,
        getData: vi.fn((type: string) =>
          type === "text/plain" ? text : "",
        ),
      },
      preventDefault,
    } as unknown as ClipboardEvent,
  );

  expect(handled).toBe(enabled);
  expect(preventDefault).toHaveBeenCalledTimes(enabled ? 1 : 0);
  expect(pasteText).toHaveBeenCalledTimes(expectedText ? 1 : 0);
  if (expectedText) expect(pasteText).toHaveBeenCalledWith(expectedText);
  expect(upload).toHaveBeenCalledTimes(uploadsImage ? 1 : 0);
  if (uploadsImage) {
    expect(upload).toHaveBeenCalledWith(imageFile, expect.any(Object), false);
  }
});

it("keeps mixed images ahead of an accompanying image file item", () => {
  const schema = new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { content: "text*", group: "block" },
      image: { group: "block", atom: true, attrs: { src: {} } },
      text: { group: "inline" },
    },
    marks: { strong: {} },
  });
  const strong = schema.mark("strong");
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, schema.text("Start ", [strong])),
  ]);
  const view = {
    state: EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 7),
    }),
    dispatch(transaction: any) {
      this.state = this.state.apply(transaction);
    },
  };
  const upload = vi.fn();
  const preventDefault = vi.fn();
  let imageReplacement = "";
  const imageElement = {
    getAttribute: vi.fn((name: string) =>
      name === "src" ? "https://example.com/image.png" : null,
    ),
    replaceWith: vi.fn((replacement: string) => {
      imageReplacement = replacement;
    }),
  };
  const body = {
    querySelectorAll: vi.fn((selector: string) => {
      if (selector === "img[src]") return [imageElement];
      if (selector === "br") return [];
      return [{ append: vi.fn() }];
    }),
    get textContent() {
      return `Before${imageReplacement}After`;
    },
  };
  vi.stubGlobal("DOMParser", class {
    parseFromString() {
      return { body };
    }
  });

  const handler = createPasteHandler({} as Editor, upload, true);
  const handled = handler(
    view,
    {
      clipboardData: {
        items: [imageItem],
        getData: vi.fn((type: string) =>
          type === "text/html" ? "<p>Before<img src=x>After</p>" : "BeforeAfter",
        ),
      },
      preventDefault,
    } as unknown as ClipboardEvent,
  );

  expect(handled).toBe(true);
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(upload).not.toHaveBeenCalled();
  expect(view.state.doc.textContent).toBe("Start BeforeAfter");
  expect(view.state.doc.child(0).firstChild?.marks).toEqual([strong]);
  expect(view.state.doc.child(1).attrs.src).toBe("https://example.com/image.png");
  expect(view.state.doc.child(2).firstChild?.marks).toEqual([strong]);
  vi.unstubAllGlobals();
});
