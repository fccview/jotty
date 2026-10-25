import { getSchema } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";
import { htmlToNodes, serializeOptions } from "@/app/_utils/markdown/editor-bridge";
import { saveMarkdown } from "@/app/_utils/markdown/session";
import { schemaExtensions } from "@/app/_utils/markdown/schema";
import { NodeName } from "@/app/_utils/markdown/serialize/types";
import type { DomKit } from "@/app/_utils/markdown/dom-kit";
import type { TableSyntax } from "@/app/_types";
import { happyKit } from "./happy-kit";
import { hookKit, type DomHook } from "./hooks";
import { rebaseLinks } from "./rebase";
import { tickTasks } from "./tasks";

export interface HtmlImport {
  html: string;
  baseUrl?: string;
  tableSyntax?: TableSyntax;
}

let schema: Schema | null = null;

export const jottySchema = () => {
  schema ??= getSchema(schemaExtensions());
  return schema;
};

export const markdownOf = (html: string, kit: DomKit, tableSyntax?: TableSyntax) => {
  const shape = jottySchema();
  const content = htmlToNodes(shape, kit)(html);
  return saveMarkdown(
    { type: NodeName.Doc, content },
    null,
    serializeOptions(shape, tableSyntax, kit),
  );
};

export const htmlToMarkdown = async ({ html, baseUrl, tableSyntax }: HtmlImport) => {
  const { kit, close } = happyKit();
  const hooks: DomHook[] = baseUrl ? [tickTasks, rebaseLinks(baseUrl)] : [tickTasks];
  try {
    return markdownOf(html, hookKit(kit, hooks), tableSyntax);
  } finally {
    await close();
  }
};
