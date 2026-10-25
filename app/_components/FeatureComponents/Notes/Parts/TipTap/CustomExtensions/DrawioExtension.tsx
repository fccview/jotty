"use client";

import type { NodeConfig } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";
import { DiagramFrame, DiagramToolButton } from "@/app/_components/FeatureComponents/Notes/Parts/Diagrams/DiagramFrame";
import {
  DrawioEditorModal,
  type DrawioSave,
} from "@/app/_components/FeatureComponents/Notes/Parts/Diagrams/DrawioEditorModal";
import { useReturnFocus } from "@/app/_components/FeatureComponents/Notes/Parts/Diagrams/useReturnFocus";
import { DEFAULT_DRAWIO_URL, DIAGRAM_PROXY_PATH } from "@/app/_consts/diagrams";
import { DiagramTheme, toDiagramTheme } from "@/app/_utils/markdown/diagram-comment";
import type { DrawioOptions } from "@/app/_utils/markdown/schema/diagrams";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    drawio: {
      insertDrawIo: () => ReturnType;
    };
  }
}

const drawioBaseUrl = ({ drawioUrl, drawioProxyEnabled }: DrawioOptions) =>
  drawioProxyEnabled ? DIAGRAM_PROXY_PATH : drawioUrl || DEFAULT_DRAWIO_URL;

export const DrawioNodeView = ({
  node,
  editor,
  extension,
  getPos,
  updateAttributes,
  deleteNode,
}: NodeViewProps) => {
  const t = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const returnFocus = useReturnFocus(editor, getPos);
  const themeMode = toDiagramTheme(node.attrs.themeMode);
  const diagramData: string | null = node.attrs.diagramData || null;
  const svgData: string | null = node.attrs.svgData || null;
  const isBlank = !diagramData && !svgData;

  const save = (attrs: DrawioSave) => {
    try {
      updateAttributes(attrs);
    } catch (error) {
      console.error("Failed to update draw.io diagram:", error);
    }
  };

  const closeEditor = () => {
    setIsEditing(false);
    returnFocus();
  };

  const toggleTheme = () =>
    updateAttributes({ themeMode: themeMode === DiagramTheme.Dark ? DiagramTheme.Light : DiagramTheme.Dark });

  const actions = editor.isEditable && !isBlank && (
    <>
      <DiagramToolButton label={t("editor.editDiagram")} onClick={() => setIsEditing(true)}>
        {t("common.edit")}
      </DiagramToolButton>
      <DiagramToolButton label={t("editor.deleteDiagram")} onClick={() => setShowDeleteModal(true)} destructive>
        {t("common.delete")}
      </DiagramToolButton>
    </>
  );

  const placeholder = isBlank ? (
    <div className="flex flex-wrap justify-center gap-2 py-8">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        disabled={!editor.isEditable}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        {t("editor.createVisualDiagram")}
      </button>
      <button
        type="button"
        onClick={() => setShowDeleteModal(true)}
        disabled={!editor.isEditable}
        className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
      >
        {t("common.delete")}
      </button>
    </div>
  ) : (
    <p className="text-center text-muted-foreground">{t("notes.drawioNoPreview")}</p>
  );

  return (
    <NodeViewWrapper className="drawio-node-wrapper">
      <DiagramFrame
        svg={svgData}
        alt={t("editor.drawioDiagram")}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        placeholder={placeholder}
        actions={actions}
        className="drawio-diagram-container"
      />
      {isEditing && (
        <DrawioEditorModal
          baseUrl={drawioBaseUrl(extension.storage)}
          diagramData={diagramData}
          onSave={save}
          onClose={closeEditor}
        />
      )}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          deleteNode();
        }}
        title={t("common.delete")}
        message={t("common.confirmDeleteItem", { itemTitle: t("editor.drawioDiagram") })}
        confirmText={t("common.delete")}
        variant="destructive"
      />
    </NodeViewWrapper>
  );
};

export const DRAWIO_VIEW: Partial<NodeConfig<DrawioOptions, DrawioOptions>> = {
  addNodeView() {
    return ReactNodeViewRenderer(DrawioNodeView, {
      as: "div",
      contentDOMElementTag: "div",
    });
  },

  addStorage() {
    return {
      drawioUrl: this.options.drawioUrl,
      drawioProxyEnabled: this.options.drawioProxyEnabled,
    };
  },

  addCommands() {
    return {
      insertDrawIo:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { diagramData: null, svgData: null },
          }),
    };
  },
};
