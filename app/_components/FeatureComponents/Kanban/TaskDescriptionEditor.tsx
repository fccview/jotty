"use client";

import { TiptapEditor } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/TipTapEditor";
import { MinimalEditorPanel } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/MinimalEditorPanel";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useMinimalMode } from "@/app/_hooks/useMinimalMode";
import { ItemTypes } from "@/app/_types/enums";

interface TaskDescriptionEditorProps {
  boardUuid: string;
  content: string;
  onContentChange: (markdownContent: string) => void;
}

export const TaskDescriptionEditor = ({
  boardUuid,
  content,
  onContentChange,
}: TaskDescriptionEditorProps) => {
  const { user } = useAppMode();
  const isMinimalMode = useMinimalMode();

  if (isMinimalMode) {
    return (
      <MinimalEditorPanel
        isEditing
        noteContent={content}
        onEditorContentChange={(next) => onContentChange(next)}
        renderWrapper={(children) => (
          <div className="h-[40vh] min-h-[200px] lg:h-[48vh]">{children}</div>
        )}
      />
    );
  }

  return (
    <div className="h-[40vh] min-h-[200px] lg:h-[48vh] border border-input rounded-jotty overflow-hidden">
      <TiptapEditor
        content={content}
        onChange={(next) => onContentChange(next)}
        tableSyntax={user?.tableSyntax}
        attachTarget={boardUuid ? { uuid: boardUuid, type: ItemTypes.CHECKLIST } : undefined}
      />
    </div>
  );
};
