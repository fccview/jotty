import { vi } from "vitest";

vi.unmock("unified");
vi.unmock("unist-util-visit");
vi.unmock("js-beautify");
vi.unmock("@/app/_utils/markdown-utils");

import { Editor } from "@tiptap/core";
import { createEditorExtensions } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/EditorUtils/editorConfig";
import { loadMarkdown, saveMarkdown } from "@/app/_utils/markdown/session";
import { htmlToNodes, serializeOptions } from "@/app/_utils/markdown/editor-bridge";
import type { NodeJson } from "@/app/_utils/markdown/serialize/types";
import type { TableSyntax } from "@/app/_types";

let shared: Editor | null = null;

export const editor = () => {
  shared ??= new Editor({
    extensions: createEditorExtensions({ onImageClick: () => {}, onTableSelect: () => {} }),
  });
  return shared;
};

export const open = (markdown: string) => {
  const instance = editor();
  const loaded = loadMarkdown(markdown, htmlToNodes(instance.schema));
  instance.commands.setContent(loaded.doc, { emitUpdate: false });
  return { ...loaded, json: instance.getJSON() as NodeJson };
};

export const unchangedSave = (markdown: string, tableSyntax?: TableSyntax) => {
  const { json, snapshot } = open(markdown);
  return saveMarkdown(json, snapshot, serializeOptions(editor().schema, tableSyntax));
};

export const freshSave = (markdown: string, tableSyntax?: TableSyntax) => {
  const { json } = open(markdown);
  return saveMarkdown(json, null, serializeOptions(editor().schema, tableSyntax));
};

export const reloadedJson = (markdown: string) => open(markdown).json;

export const editAndSave = (
  markdown: string,
  edit: (instance: Editor) => void,
  tableSyntax?: TableSyntax,
) => {
  const { snapshot } = open(markdown);
  const instance = editor();
  edit(instance);
  return saveMarkdown(instance.getJSON() as NodeJson, snapshot, serializeOptions(instance.schema, tableSyntax));
};
