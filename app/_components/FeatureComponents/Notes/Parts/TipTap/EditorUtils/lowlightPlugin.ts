import { findChildren } from "@tiptap/core";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

function parseNodes(
  nodes: any[],
  className: string[] = []
): { text: string; classes: string[] }[] {
  return nodes.flatMap((node) => {
    const classes = [
      ...className,
      ...(node.properties ? node.properties.className : []),
    ];
    if (node.children) {
      return parseNodes(node.children, classes);
    }
    return { text: node.value, classes };
  });
}

function getHighlightNodes(result: any) {
  return result.value || result.children || [];
}

function getDecorations({
  doc,
  name,
  lowlight,
  defaultLanguage,
}: {
  doc: ProsemirrorNode;
  name: string;
  lowlight: any;
  defaultLanguage: string | null | undefined;
}) {
  const decorations: Decoration[] = [];

  findChildren(doc, (node) => node.type.name === name).forEach((block) => {
    let from = block.pos + 1;
    const language = block.node.attrs.language || defaultLanguage;

    if (language && lowlight.registered?.(language)) {
      try {
        const nodes = getHighlightNodes(
          lowlight.highlight(language, block.node.textContent)
        );
        parseNodes(nodes).forEach((node) => {
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

export function LowlightPlugin({
  name,
  lowlight,
  defaultLanguage,
}: {
  name: string;
  lowlight: any;
  defaultLanguage: string | null | undefined;
}) {
  return new Plugin({
    key: new PluginKey("lowlight"),
    state: {
      init: (_, { doc }) =>
        getDecorations({ doc, name, lowlight, defaultLanguage }),
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
            lowlight,
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
