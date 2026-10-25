"use client";

import type { NodeConfig } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";
import { MermaidRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/MermaidRenderer";
import { MermaidEditorModal } from "@/app/_components/FeatureComponents/Notes/Parts/Diagrams/MermaidEditorModal";
import { DiagramToolbar, DiagramToolButton } from "@/app/_components/FeatureComponents/Notes/Parts/Diagrams/DiagramFrame";
import { useReturnFocus } from "@/app/_components/FeatureComponents/Notes/Parts/Diagrams/useReturnFocus";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaid: {
      setMermaid: (content: string) => ReturnType;
    };
  }
}

export const MermaidNodeView = ({ node, editor, getPos, updateAttributes, deleteNode }: NodeViewProps) => {
  const t = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const returnFocus = useReturnFocus(editor, getPos);
  const content = String(node.attrs.content || "");

  const closeEditor = () => {
    setIsEditing(false);
    returnFocus();
  };

  return (
    <NodeViewWrapper className="mermaid-node-wrapper">
      <div className="mermaid-diagram-container relative group border border-border rounded-jotty p-4 my-4 bg-background">
        {editor.isEditable && (
          <DiagramToolbar>
            <DiagramToolButton label={t("editor.editDiagram")} onClick={() => setIsEditing(true)}>
              {t("common.edit")}
            </DiagramToolButton>
            <DiagramToolButton label={t("editor.deleteDiagram")} onClick={() => setShowDeleteModal(true)} destructive>
              {t("common.delete")}
            </DiagramToolButton>
          </DiagramToolbar>
        )}
        {content.trim() ? (
          <MermaidRenderer code={content} className="my-0" />
        ) : (
          <p className="text-center text-muted-foreground">{t("editor.enterMermaidCode")}</p>
        )}
      </div>
      {isEditing && (
        <MermaidEditorModal
          content={content}
          onSave={(next) => updateAttributes({ content: next })}
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
        message={t("common.confirmDeleteItem", { itemTitle: t("editor.mermaidDiagram") })}
        confirmText={t("common.delete")}
        variant="destructive"
      />
    </NodeViewWrapper>
  );
};

export const MERMAID_VIEW: Partial<NodeConfig> = {
  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView);
  },

  addCommands() {
    return {
      setMermaid:
        (content: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { content },
          }),
    };
  },
};
