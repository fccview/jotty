"use client";

import { ReactNode } from "react";
import { MinimalModeEditor } from "./MinimalModeEditor";
import { useSettings } from "@/app/_utils/settings-store";

interface MinimalEditorPanelProps {
  /** Whether the editor should be in editing (vs. read-only view) mode. */
  isEditing: boolean;
  /** Content rendered inside the minimal editor. */
  noteContent: string;
  /** Forwarded to MinimalModeEditor; signature matches its own. */
  onEditorContentChange: (
    content: string,
    isMarkdown: boolean,
    isDirty: boolean,
  ) => void;
  /**
   * Wrapper class for the minimal-mode surface. Defaults to a full-height
   * flex container matching the notes editor layout; callers with a bespoke
   * container (e.g. the task description editor) can pass their own.
   */
  className?: string;
  /**
   * When provided, this node replaces the default wrapper div entirely and
   * receives the MinimalModeEditor as its child — used by callers that need a
   * fully custom container (border, rounded corners, fixed height, etc.).
   */
  renderWrapper?: (children: ReactNode) => ReactNode;
}

/**
 * Renders the minimal (markdown-only) editor surface. Pair with the
 * `useMinimalMode` hook to decide whether to render this panel or fall through
 * to the rich (Tiptap) editor. Centralises the repeated
 * `<MinimalModeEditor .../>` wiring (props + compactMode lookup) that
 * previously was duplicated across the note editor and the task description
 * editor.
 */
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
      {renderWrapper ? renderWrapper(editor) : <div className={className}>{editor}</div>}
    </>
  );
};