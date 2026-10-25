"use client";

import type { NodeConfig } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";
import { DiagramFrame, DiagramToolButton } from "@/app/_components/FeatureComponents/Notes/Parts/Diagrams/DiagramFrame";
import {
  ExcalidrawEditorModal,
  type ExcalidrawSave,
} from "@/app/_components/FeatureComponents/Notes/Parts/Diagrams/ExcalidrawEditorModal";
import { useReturnFocus } from "@/app/_components/FeatureComponents/Notes/Parts/Diagrams/useReturnFocus";
import { DiagramTheme, toDiagramTheme } from "@/app/_utils/markdown/diagram-comment";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    excalidraw: {
      insertExcalidraw: () => ReturnType;
    };
  }
}

export const ExcalidrawNodeView = ({ node, editor, getPos, updateAttributes, deleteNode }: NodeViewProps) => {
  const t = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const returnFocus = useReturnFocus(editor, getPos);
  const themeMode = toDiagramTheme(node.attrs.themeMode);
  const diagramData: string | null = node.attrs.diagramData || null;
  const svgData: string | null = node.attrs.svgData || null;
  const isBlank = !diagramData && !svgData;

  const save = (attrs: ExcalidrawSave) => {
    try {
      updateAttributes(attrs);
    } catch (error) {
      console.error("Failed to update Excalidraw diagram:", error);
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
        {t("editor.createExcalidrawDiagram")}
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
    <p className="text-center text-muted-foreground">{t("notes.excalidrawNoPreview")}</p>
  );

  return (
    <NodeViewWrapper className="excalidraw-node-wrapper">
      <DiagramFrame
        svg={svgData}
        alt={t("editor.excalidrawDiagram")}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        placeholder={placeholder}
        actions={actions}
        className="excalidraw-diagram-container"
      />
      {isEditing && <ExcalidrawEditorModal diagramData={diagramData} onSave={save} onClose={closeEditor} />}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          deleteNode();
        }}
        title={t("common.delete")}
        message={t("common.confirmDeleteItem", { itemTitle: t("editor.excalidrawDiagram") })}
        confirmText={t("common.delete")}
        variant="destructive"
      />
    </NodeViewWrapper>
  );
};

export const EXCALIDRAW_VIEW: Partial<NodeConfig> = {
  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawNodeView, {
      as: "div",
      contentDOMElementTag: "div",
    });
  },

  addCommands() {
    return {
      insertExcalidraw:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { diagramData: null, svgData: null },
          }),
    };
  },
};
