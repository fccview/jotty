import { Node, type AnyExtension, type NodeConfig } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import type { Doc } from "yjs";
import type { Awareness } from "y-protocols/awareness";
import { liveCaret, liveSelection, type AvatarOf } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/EditorUtils/liveCaret";
import { PrismPlugin } from "./prismPlugin";
import { FILE_ATTACHMENT_VIEW } from "@/app/_components/FeatureComponents/Notes/Parts/FileAttachment/FileAttachmentExtension";
import { CodeBlockNodeView } from "@/app/_components/FeatureComponents/Notes/Parts/CodeBlock/CodeBlockNodeView";
import { DETAILS_VIEW } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/DetailsExtension";
import { KeyboardShortcuts } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/KeyboardShortcuts";
import { OverlayExtension, type OverlayPosition } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/OverlayExtension";
import { SlashCommands } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/SlashCommands";
import { INTERNAL_LINK_VIEW } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/InternalLink";
import { TAG_LINK_VIEW } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/TagLink";
import { MERMAID_VIEW } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/MermaidExtension";
import { DRAWIO_VIEW } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/DrawioExtension";
import { EXCALIDRAW_VIEW } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/ExcalidrawExtension";
import { CALLOUT_VIEW } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/CalloutExtension";
import { RAW_BLOCK_VIEW, RAW_INLINE_VIEW } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/RawMarkdownExtension";
import { AtomGuard } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/AtomGuard";
import { MarkdownPaste } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/MarkdownPaste";
import { BoldItalicInput } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/BoldItalicInput";
import { DEFAULT_DRAWIO_URL } from "@/app/_consts/diagrams";
import { PLAIN_CODE_LANGUAGE } from "@/app/_utils/markdown/consts";
import { MarkName, NodeName } from "@/app/_utils/markdown/serialize/types";
import { STARTER_KIT, schemaExtensions, type SchemaLayer } from "@/app/_utils/markdown/schema";

interface OverlayCallbacks {
  onImageClick: (position: OverlayPosition) => void;
  onTableSelect: (position: any) => void;
  onLinkRequest?: (hasSelection: boolean) => void;
}

interface EditorSettings {
  enableSlashCommands: boolean;
  enableBubbleMenu: boolean;
  enableTableToolbar: boolean;
  enableBilateralLinks: boolean;
  enableTags?: boolean;
  drawioUrl?: string;
  drawioProxyEnabled?: boolean;
}

interface EditorData {
  username?: string;
  tags?: string[];
}

interface LiveSession {
  doc: Doc;
  awareness: Awareness;
  avatarOf: AvatarOf;
}

const CODE_BLOCK_VIEW: Partial<NodeConfig> = {
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },
  addProseMirrorPlugins() {
    return [
      PrismPlugin({
        name: this.name,
        defaultLanguage: PLAIN_CODE_LANGUAGE,
      }),
    ];
  },
};

const NODE_VIEWS: Record<string, Partial<NodeConfig>> = {
  [NodeName.Details]: DETAILS_VIEW,
  [NodeName.Callout]: CALLOUT_VIEW,
  [NodeName.InternalLink]: INTERNAL_LINK_VIEW,
  [NodeName.TagLink]: TAG_LINK_VIEW,
  [NodeName.CodeBlock]: CODE_BLOCK_VIEW,
  [NodeName.FileAttachment]: FILE_ATTACHMENT_VIEW,
  [NodeName.Mermaid]: MERMAID_VIEW,
  [NodeName.Drawio]: DRAWIO_VIEW,
  [NodeName.Excalidraw]: EXCALIDRAW_VIEW,
  [NodeName.RawBlock]: RAW_BLOCK_VIEW,
  [NodeName.RawInline]: RAW_INLINE_VIEW,
};

const GUARDED_ATOMS = [
  NodeName.RawBlock,
  NodeName.RawInline,
  NodeName.Mermaid,
  NodeName.Drawio,
  NodeName.Excalidraw,
];

const DEFAULT_SETTINGS: EditorSettings = {
  enableSlashCommands: true,
  enableBubbleMenu: true,
  enableTableToolbar: true,
  enableBilateralLinks: true,
};

const withView = (extension: AnyExtension): AnyExtension => {
  const view = NODE_VIEWS[extension.name];
  return view && extension instanceof Node ? extension.extend(view) : extension;
};

export const createEditorExtensions = (
  callbacks: OverlayCallbacks,
  editorSettings?: EditorSettings,
  editorData?: EditorData,
  t?: (key: string) => string,
  live?: LiveSession | null,
) => {
  const settings = editorSettings || DEFAULT_SETTINGS;

  const extras: Record<string, SchemaLayer> = {
    [STARTER_KIT]: (kit) => [
      live ? kit.configure({ undoRedo: false }) : kit,
      BoldItalicInput,
      MarkdownPaste,
    ],
    [NodeName.Callout]: (callout) => [
      withView(callout),
      KeyboardShortcuts.configure({
        onLinkRequest: callbacks.onLinkRequest,
      }),
      OverlayExtension.configure({
        onImageClick: callbacks.onImageClick,
        onTableSelect: callbacks.onTableSelect,
      }),
    ],
    [MarkName.Highlight]: (highlight) => [
      highlight,
      SlashCommands.configure({
        tags: editorData?.tags || [],
        enableBilateralLinks: settings.enableBilateralLinks,
        enableSlashCommands: settings.enableSlashCommands,
        enableTags: settings.enableTags !== false,
        t: t || ((key: string) => key),
      }),
    ],
    [NodeName.Drawio]: (drawio) => [
      withView(drawio).configure({
        drawioUrl: settings.drawioUrl || DEFAULT_DRAWIO_URL,
        drawioProxyEnabled: settings.drawioProxyEnabled || false,
      }),
    ],
    [NodeName.RawInline]: (rawInline) => [
      withView(rawInline),
      AtomGuard.configure({ types: GUARDED_ATOMS }),
    ],
  };

  const layer: SchemaLayer = (extension) =>
    extras[extension.name]?.(extension) ?? [withView(extension)];

  return [
    ...schemaExtensions(layer),
    ...(live ? [
      Collaboration.configure({ document: live.doc }),
      CollaborationCaret.configure({
        provider: { awareness: live.awareness },
        user: { name: editorData?.username || "" },
        render: liveCaret(live.avatarOf),
        selectionRender: liveSelection,
      }),
    ] : []),
  ];
};
