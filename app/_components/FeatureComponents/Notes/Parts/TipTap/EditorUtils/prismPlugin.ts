import { findChildren } from "@tiptap/core";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import Prism from "prismjs";
import { prism } from "@/app/_utils/prism-utils";

function parsePrismTokens(
  tokens: any[],
  className: string[] = []
): { text: string; classes: string[] }[] {
  const result: { text: string; classes: string[] }[] = [];

  for (const token of tokens) {
    if (typeof token === "string") {
      result.push({ text: token, classes: className });
    } else if (typeof token === "object" && token !== null) {
      const tokenType = token.type || "";
      const tokenAlias = token.alias || [];
      const classes = [
        ...className,
        `token`,
        tokenType,
        ...(Array.isArray(tokenAlias)
          ? tokenAlias
          : typeof tokenAlias === "string"
          ? [tokenAlias]
          : []),
      ].filter(Boolean);

      if (token.content !== undefined) {
        if (typeof token.content === "string") {
          result.push({ text: token.content, classes });
        } else if (Array.isArray(token.content)) {
          result.push(...parsePrismTokens(token.content, classes));
        }
      }
    }
  }

  return result;
}

function getDecorations({
  doc,
  name,
  defaultLanguage,
}: {
  doc: ProsemirrorNode;
  name: string;
  defaultLanguage: string | null | undefined;
}) {
  const decorations: Decoration[] = [];

  findChildren(doc, (node) => node.type.name === name).forEach((block) => {
    let from = block.pos + 1;
    const language =
      block.node.attrs.language || defaultLanguage || "plaintext";

    if (language && prism.registered(language)) {
      try {
        const code = block.node.textContent;
        const grammar = prism.languages[language];
        const tokens = Prism.tokenize(code, grammar);
        const parsedNodes = parsePrismTokens(tokens);

        parsedNodes.forEach((node) => {
          const to = from + node.text.length;
          if (node.classes.length) {
            decorations.push(
              Decoration.inline(from, to, { class: node.classes.join(" ") })
            );
          }
          from = to;
        });
      } catch (error) {
        console.warn(
          `Failed to highlight code with language "${language}":`,
          error
        );
      }
    }
  });

  return DecorationSet.create(doc, decorations);
}

export function PrismPlugin({
  name,
  defaultLanguage,
}: {
  name: string;
  defaultLanguage: string | null | undefined;
}) {
  return new Plugin({
    key: new PluginKey("prism"),
    state: {
      init: (_, { doc }) => getDecorations({ doc, name, defaultLanguage }),
      apply: (transaction, decorationSet, oldState, newState) => {
        if (!transaction.docChanged) {
          return decorationSet.map(transaction.mapping, transaction.doc);
        }

        const oldNodeName = oldState.selection.$head.parent.type.name;
        const newNodeName = newState.selection.$head.parent.type.name;
        const oldNodes = findChildren(
          oldState.doc,
          (node) => node.type.name === name
        );
        const newNodes = findChildren(
          newState.doc,
          (node) => node.type.name === name
        );

        if (
          [oldNodeName, newNodeName].includes(name) ||
          newNodes.length !== oldNodes.length ||
          transaction.steps.some(
            (step: any) =>
              step.from !== undefined &&
              step.to !== undefined &&
              oldNodes.some(
                (node) =>
                  node.pos >= step.from &&
                  node.pos + node.node.nodeSize <= step.to
              )
          )
        ) {
          return getDecorations({
            doc: transaction.doc,
            name,
            defaultLanguage,
          });
        }

        return decorationSet.map(transaction.mapping, transaction.doc);
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
}
