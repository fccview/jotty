"use client";

import { ReactNode } from "react";
import { MinimalModeEditor } from "./MinimalModeEditor";
import { useQuickValue } from "@/app/_hooks/settings/useQuickSetting";
import { QuickSettingId } from "@/app/_consts/quick-settings";

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
  const compactMode = useQuickValue(QuickSettingId.COMPACT_MODE);

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
