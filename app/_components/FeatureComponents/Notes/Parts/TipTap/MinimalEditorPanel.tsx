"use client";

import { ReactNode } from "react";
import { MinimalModeEditor } from "./MinimalModeEditor";
import { useSettings } from "@/app/_utils/settings-store";

interface MinimalEditorPanelProps {
  isEditing: boolean;
  noteContent: string;
  onEditorContentChange: (
    content: string,
    isMarkdown: boolean,
    isDirty: boolean,
  ) => void;
  className?: string;
  renderWrapper?: (children: ReactNode) => ReactNode;
}

export const MinimalEditorPanel = ({
  isEditing,
  noteContent,
  onEditorContentChange,
  className = "flex-1 h-full pb-10 lg:pb-0",
  renderWrapper,
}: MinimalEditorPanelProps) => {
  const { compactMode } = useSettings();

  const editor = (
    <MinimalModeEditor
      isEditing={isEditing}
      noteContent={noteContent}
      onEditorContentChange={onEditorContentChange}
      compactMode={compactMode}
    />
  );

  return (
    <>
      {renderWrapper ? (
        renderWrapper(editor)
      ) : (
        <div className={className}>{editor}</div>
      )}
    </>
  );
};
