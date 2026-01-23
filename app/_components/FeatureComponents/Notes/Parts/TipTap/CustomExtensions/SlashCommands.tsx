import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import tippy from "tippy.js";
import {
  Heading01Icon,
  Heading02Icon,
  LeftToRightListBulletIcon,
  CheckmarkSquare04Icon,
  SourceCodeIcon,
  QuoteUpIcon,
  LayoutTable01Icon,
  Image02Icon,
  Attachment01Icon,
  SquareArrowDown02Icon,
  SharedWifiIcon,
  DrawingModeIcon,
  PencilIcon,
  Idea01Icon,
} from "hugeicons-react";
import { SlashCommandsList } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/SlashCommandsList";
import { AtMentionsList } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/AtMentionsList";
import { TagMentionsList } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/TagMentionsList";
import { ItemType } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { PluginKey } from "@tiptap/pm/state";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: any; range: any }) => void;
}

export interface AtMentionItem {
  title: string;
  type: ItemType;
  category: string;
  id: string;
  uuid?: string;
}

let atMentionData = {
  notes: [] as any[],
  checklists: [] as any[],
  username: "",
};

let tagSuggestionData = {
  tags: [] as string[],
};

const getSlashCommands = (t: (key: string) => string): SlashCommandItem[] => [
  {
    title: t("editor.heading1"),
    description: t("editor.bigSectionHeading"),
    icon: <Heading01Icon className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: t("editor.heading2"),
    description: t("editor.mediumSectionHeading"),
    icon: <Heading02Icon className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: t("editor.bulletList"),
    description: t("editor.createBulletedList"),
    icon: <LeftToRightListBulletIcon className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: t("editor.taskList"),
    description: t("editor.createTaskList"),
    icon: <CheckmarkSquare04Icon className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: t("editor.codeBlock"),
    description: t("editor.createCodeBlock"),
    icon: <SourceCodeIcon className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: t("editor.quote"),
    description: t("editor.createBlockquote"),
    icon: <QuoteUpIcon className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: t("editor.table"),
    description: t("editor.insertATable"),
    icon: <LayoutTable01Icon className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: t("editor.image"),
    description: t("editor.insertAnImage"),
    icon: <Image02Icon className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const url = window.prompt("Image URL");
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },
  {
    title: t("editor.collapsible"),
    description: t("editor.createCollapsibleSection"),
    icon: <SquareArrowDown02Icon className="h-4 w-4" />,
    command: ({ editor, range }) => {
      const { from, to, empty } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, " ");
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleWrap("details", { summary: !empty ? selectedText : undefined })
        .run();
    },
  },
  {
    title: t("editor.callout"),
    description: t("editor.createCallout"),
    icon: <Idea01Icon className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCallout("info").run();
    },
  },
  {
    title: t("editor.mermaidDiagram"),
    description: t("editor.createMermaidDiagram"),
    icon: <SharedWifiIcon className="h-4 w-4" />,
    command: ({ editor, range }) => {
      const defaultMermaid = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Option 1]
    B -->|No| D[Option 2]
    C --> E[End]
    D --> E`;
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMermaid(defaultMermaid)
        .run();
    },
  },
  {
    title: t("editor.drawioDiagram"),
    description: t("editor.createVisualDiagram"),
    icon: <DrawingModeIcon className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertDrawIo().run();
    },
  },
  {
    title: t("editor.excalidrawDiagram"),
    description: t("editor.createExcalidrawDiagram"),
    icon: <PencilIcon className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertExcalidraw().run();
    },
  },
];

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      enableBilateralLinks: true,
      enableSlashCommands: true,
      enableTags: true,
      t: (key: string) => key,
      suggestion: {
        char: "/",
        command: ({
          editor,
          range,
          props,
        }: {
          editor: any;
          range: any;
          props: SlashCommandItem;
        }) => {
          props.command({ editor, range });
        },
        items: ({ query, editor }: { query: string; editor: any }) => {
          const t = editor?.storage?.slashCommands?.t || ((key: string) => key);
          const slashCommands = getSlashCommands(t);
          return slashCommands.filter(
            (item) =>
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              item.description.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: () => {
          let component: ReactRenderer;
          let popup: any;

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(SlashCommandsList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              const referenceElement = document.createElement("div");
              referenceElement.style.position = "absolute";
              referenceElement.style.pointerEvents = "none";
              referenceElement.style.zIndex = "10";
              document.body.appendChild(referenceElement);

              const rect = props.clientRect();
              referenceElement.style.left = `${rect.left}px`;
              referenceElement.style.top = `${rect.top}px`;

              popup = tippy(referenceElement, {
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                theme: "light",
                maxWidth: "none",
                appendTo: () => document.body,
              });

              (popup as any).referenceElement = referenceElement;
            },

            onUpdate(props: any) {
              component.updateProps(props);

              if (!props.clientRect) {
                return;
              }

              const rect = props.clientRect();
              const referenceElement = (popup as any).referenceElement;
              if (referenceElement) {
                referenceElement.style.left = `${rect.left}px`;
                referenceElement.style.top = `${rect.top}px`;
              }
            },

            onKeyDown(props: any) {
              if (props.event.key === "Escape") {
                popup[0].hide();
                return true;
              }

              return (component.ref as any)?.onKeyDown?.(props.event);
            },

            onExit() {
              if (popup && popup[0]) {
                popup[0].destroy();
                const referenceElement = (popup as any).referenceElement;
                if (referenceElement && referenceElement.parentNode) {
                  referenceElement.parentNode.removeChild(referenceElement);
                }
              }
              component.destroy();
            },
          };
        },
      },
      atSuggestion: {
        char: "@",
        command: ({
          editor,
          range,
          props,
        }: {
          editor: any;
          range: any;
          props: AtMentionItem;
        }) => {
          const linkTarget = props.uuid ? `/jotty/${props.uuid}` : ``;
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: "internalLink",
              attrs: {
                href: linkTarget,
                title: props.title,
                type: props.type,
                category: props.category,
                uuid: props.uuid,
                itemId: props.id,
                convertToBidirectional: false,
              },
            })
            .run();
        },
        items: ({ query }: { query: string }) => {
          const allItems = [
            ...atMentionData.notes.map((note: any) => ({
              ...note,
              type: ItemTypes.NOTE as const,
            })),
            ...atMentionData.checklists.map((checklist: any) => ({
              ...checklist,
              type: ItemTypes.CHECKLIST as const,
            })),
          ];

          if (!query.trim()) return allItems.slice(0, 8);

          const lowerCaseQuery = query.toLowerCase();

          return allItems
            .filter(
              (item) =>
                item.title.toLowerCase().includes(lowerCaseQuery) ||
                item.category?.toLowerCase().includes(lowerCaseQuery)
            )
            .slice(0, 8);
        },
        render: () => {
          let component: ReactRenderer;
          let popup: any;

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(AtMentionsList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              const referenceElement = document.createElement("div");
              referenceElement.style.position = "absolute";
              referenceElement.style.pointerEvents = "none";
              referenceElement.style.zIndex = "10";
              document.body.appendChild(referenceElement);

              const rect = props.clientRect();
              referenceElement.style.left = `${rect.left}px`;
              referenceElement.style.top = `${rect.top}px`;

              popup = tippy(referenceElement, {
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                theme: "light",
                maxWidth: "none",
                appendTo: () => document.body,
              });

              (popup as any).referenceElement = referenceElement;
            },

            onUpdate(props: any) {
              component.updateProps(props);

              if (!props.clientRect) {
                return;
              }

              const rect = props.clientRect();
              const referenceElement = (popup as any).referenceElement;
              if (referenceElement) {
                referenceElement.style.left = `${rect.left}px`;
                referenceElement.style.top = `${rect.top}px`;
              }
            },

            onKeyDown(props: any) {
              if (props.event.key === "Escape") {
                popup[0].hide();
                return true;
              }

              return (component.ref as any)?.onKeyDown?.(props.event);
            },

            onExit() {
              if (popup && popup[0]) {
                popup[0].destroy();
                const referenceElement = (popup as any).referenceElement;
                if (referenceElement && referenceElement.parentNode) {
                  referenceElement.parentNode.removeChild(referenceElement);
                }
              }
              component.destroy();
            },
          };
        },
      },
      hashSuggestion: {
        char: "#",
        allowSpaces: false,
        startOfLine: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: any;
          range: any;
          props: { tag: string; display: string };
        }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(`<span data-tag="${props.tag}">${props.display}</span>`)
            .run();
        },
        items: ({ query }: { query: string }) => {
          const lowerQuery = query.toLowerCase().trim();
          const filtered = tagSuggestionData.tags
            .filter((tag) => tag.toLowerCase().includes(lowerQuery))
            .slice(0, 9);

          const results = filtered.map((tag) => ({
            tag,
            display: tag,
          }));

          if (lowerQuery && !tagSuggestionData.tags.some((t) => t.toLowerCase() === lowerQuery)) {
            results.unshift({
              tag: lowerQuery,
              display: lowerQuery,
            });
          }

          return results;
        },
        render: () => {
          let component: ReactRenderer;
          let popup: any;

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(TagMentionsList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              const referenceElement = document.createElement("div");
              referenceElement.style.position = "absolute";
              referenceElement.style.pointerEvents = "none";
              referenceElement.style.zIndex = "10";
              document.body.appendChild(referenceElement);

              const rect = props.clientRect();
              referenceElement.style.left = `${rect.left}px`;
              referenceElement.style.top = `${rect.top}px`;

              popup = tippy(referenceElement, {
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                theme: "light",
                maxWidth: "none",
                appendTo: () => document.body,
              });

              (popup as any).referenceElement = referenceElement;
            },

            onUpdate(props: any) {
              component.updateProps(props);

              if (!props.clientRect) {
                return;
              }

              const rect = props.clientRect();
              const referenceElement = (popup as any).referenceElement;
              if (referenceElement) {
                referenceElement.style.left = `${rect.left}px`;
                referenceElement.style.top = `${rect.top}px`;
              }
            },

            onKeyDown(props: any) {
              if (props.event.key === "Escape") {
                popup[0].hide();
                return true;
              }

              return (component.ref as any)?.onKeyDown?.(props.event);
            },

            onExit() {
              if (popup && popup[0]) {
                popup[0].destroy();
                const referenceElement = (popup as any).referenceElement;
                if (referenceElement && referenceElement.parentNode) {
                  referenceElement.parentNode.removeChild(referenceElement);
                }
              }
              component.destroy();
            },
          };
        },
      },
    };
  },

  addStorage() {
    return {
      t: this.options.t,
    };
  },

  /** @ts-ignore */
  addCommands() {
    return {
      updateAtMentionData:
        (notes: any[], checklists: any[], username: string) => () => {
          atMentionData.notes =
            notes?.filter((note: any) => note.owner === username) || [];
          atMentionData.checklists =
            checklists?.filter(
              (checklist: any) => checklist.owner === username
            ) || [];

          return true;
        },
      updateTagSuggestionData:
        (tags: string[]) => () => {
          tagSuggestionData.tags = tags || [];
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    atMentionData.notes =
      this.options.notes?.filter(
        (note: any) => note.owner === this.options.username
      ) || [];
    atMentionData.checklists =
      this.options.checklists?.filter(
        (checklist: any) => checklist.owner === this.options.username
      ) || [];
    tagSuggestionData.tags = this.options.tags || [];

    const plugins = [];

    if (this.options.enableSlashCommands) {
      plugins.push(
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
          pluginKey: new PluginKey("slashSuggestion"),
        })
      );
    }

    if (this.options.enableBilateralLinks) {
      plugins.push(
        Suggestion({
          editor: this.editor,
          ...this.options.atSuggestion,
          pluginKey: new PluginKey("atSuggestion"),
        })
      );
    }

    if (this.options.enableTags) {
      plugins.push(
        Suggestion({
          editor: this.editor,
          ...this.options.hashSuggestion,
          pluginKey: new PluginKey("hashSuggestion"),
        })
      );
    }

    return plugins;
  },
});
