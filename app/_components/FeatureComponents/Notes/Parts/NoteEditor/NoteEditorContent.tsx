import { TiptapEditor } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/TipTapEditor";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useSettings } from "@/app/_utils/settings-store";
import { usePathname, useSearchParams } from "next/navigation";

interface NoteEditorContentProps {
  isEditing: boolean;
  noteContent?: string;
  editorContent: string;
  onEditorContentChange: (content: string, isMarkdown: boolean) => void;
}

export const NoteEditorContent = ({
  isEditing,
  noteContent,
  editorContent,
  onEditorContentChange,
}: NoteEditorContentProps) => {
  const { user } = useAppMode();
  const { compactMode } = useSettings();
  const searchParams = useSearchParams();
  const notesDefaultMode = user?.notesDefaultMode || "view";
  const editor = searchParams?.get('editor');

  return (
    <div className="flex-1 h-full pb-14 lg:pb-0">
      {notesDefaultMode === 'edit' || editor === "true" || isEditing ? (
        <TiptapEditor
          content={editorContent}
          onChange={onEditorContentChange}
          tableSyntax={user?.tableSyntax}
        />
      ) : (
        <div
          className={`px-6 pt-6 pb-12 ${compactMode ? "max-w-[900px] mx-auto" : ""
            }`}
        >
          <UnifiedMarkdownRenderer content={noteContent || ""} />
        </div>
      )}
    </div>
  );
};
