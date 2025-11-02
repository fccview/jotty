import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import tippy from "tippy.js";
import {
  Heading1,
  Heading2,
  List,
  CheckSquare,
  Code,
  Quote,
  Table,
  Image as ImageIcon,
  Paperclip,
  BookText,
} from "lucide-react";
import { SlashCommandsList } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/SlashCommandsList";
import { AtMentionsList } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/AtMentionsList";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { ItemType } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";

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
}

let atMentionData = {
  notes: [] as any[],
  checklists: [] as any[],
};

const slashCommands: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Big section heading",
    icon: <Heading1 className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2 className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a bulleted list",
    icon: <List className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Task List",
    description: "Create a task list",
    icon: <CheckSquare className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Code Block",
    description: "Create a code block",
    icon: <Code className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Quote",
    description: "Create a blockquote",
    icon: <Quote className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Table",
    description: "Insert a table",
    icon: <Table className="h-4 w-4" />,
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
    title: "Image",
    description: "Insert an image",
    icon: <ImageIcon className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const url = window.prompt("Image URL");
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },
  {
    title: "File",
    description: "Attach a file",
    icon: <Paperclip className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const url = window.prompt("File URL");
      const fileName = window.prompt("File name") || "file";
      if (url) {
        editor
          .chain()
          .focus()
          .setFileAttachment({
            url,
            fileName,
            mimeType: "application/octet-stream",
            type: "file",
          })
          .run();
      }
    },
  },
  {
    title: "Collapsible",
    description: "Create a collapsible section",
    icon: <BookText className="h-4 w-4" />,
    command: ({ editor, range }) => {
      const selectedText = editor.state.doc.textBetween(
        range.from,
        range.to,
        " "
      );
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleWrap("details", { summary: selectedText || "Summary" })
        .run();
    },
  },
];

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      enableBilateralLinks: true,
      enableSlashCommands: true,
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
        items: ({ query }: { query: string }) => {
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

              return (component.ref as any)?.onKeyDown?.(props);
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
          const encodedCategory = encodeCategoryPath(props.category);
          const url = `/${props.type}/${encodedCategory ? `${encodedCategory}/` : ""
            }${props.id}`;
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: "internalLink",
              attrs: {
                href: url,
                title: props.title,
                type: props.type,
                category: props.category,
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

              return (component.ref as any)?.onKeyDown?.(props);
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

  /** @ts-ignore */
  addCommands() {
    return {
      updateAtMentionData: (notes: any[], checklists: any[]) => () => {
        atMentionData.notes = notes;
        atMentionData.checklists = checklists;
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    atMentionData.notes = this.options.notes || [];
    atMentionData.checklists = this.options.checklists || [];

    return [
      Suggestion({
        editor: this.editor,
        ...(this.options.enableSlashCommands ? this.options.suggestion : {}),
        ...(this.options.enableBilateralLinks ? this.options.atSuggestion : {}),
      }),
    ];
  },
});
