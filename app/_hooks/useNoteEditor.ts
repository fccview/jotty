import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  convertMarkdownToHtml,
  convertHtmlToMarkdownUnified,
  processMarkdownContent,
} from "@/app/_utils/markdown-utils";
import { useSettings } from "@/app/_utils/settings-store";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { deleteNote, updateNote } from "@/app/_server/actions/note";
import { buildCategoryPath } from "@/app/_utils/global-utils";
import { Note } from "@/app/_types";

interface UseNoteEditorProps {
  note: Note;
  onUpdate: (updatedNote: Note) => void;
  onDelete: (deletedId: string) => void;
  onBack: () => void;
}

export const useNoteEditor = ({
  note,
  onUpdate,
  onDelete,
  onBack,
}: UseNoteEditorProps) => {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [category, setCategory] = useState(note.category || "Uncategorized");
  const [editorContent, setEditorContent] = useState(() =>
    convertMarkdownToHtml(note.content || "")
  );
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState({
    isSaving: false,
    isAutoSaving: false,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);

  const { autosaveNotes } = useSettings();
  const {
    registerNavigationGuard,
    unregisterNavigationGuard,
    executePendingNavigation,
  } = useNavigationGuard();
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const derivedMarkdownContent = useMemo(
    () =>
      isMarkdownMode
        ? processMarkdownContent(editorContent)
        : convertHtmlToMarkdownUnified(editorContent),
    [editorContent, isMarkdownMode]
  );

  useEffect(() => {
    setTitle(note.title);
    setCategory(note.category || "Uncategorized");
    setEditorContent(convertMarkdownToHtml(note.content || ""));
    setIsEditing(false);
    setHasUnsavedChanges(false);
  }, [note]);

  useEffect(() => {
    if (!isEditing) return;
    const contentChanged =
      derivedMarkdownContent.trim() !== (note.content || "").trim();
    const titleChanged = title !== note.title;
    const categoryChanged = category !== (note.category || "Uncategorized");
    setHasUnsavedChanges(contentChanged || titleChanged || categoryChanged);
  }, [derivedMarkdownContent, title, category, note, isEditing]);

  const handleSave = useCallback(
    async (autosaveNotes = false) => {
      const useAutosave = autosaveNotes ? true : false;
      if (!useAutosave) {
        setStatus((prev) => ({ ...prev, isSaving: true }));
      }
      const formData = new FormData();
      formData.append("id", note.id);
      formData.append("title", title);
      formData.append("content", derivedMarkdownContent);
      formData.append("category", category);

      const result = await updateNote(formData, useAutosave);

      if (useAutosave && result.success && result.data) {
        return;
      } else {
        setStatus((prev) => ({ ...prev, isSaving: false }));
      }

      if (result.success && result.data) {
        onUpdate(result.data);
        setIsEditing(false);
        if (result.data.id !== note.id) {
          const categoryPath = buildCategoryPath(
            category || "Uncategorized",
            result.data.id
          );
          router.push(`/note/${categoryPath}`);
        }
      }
    },
    [note.id, title, derivedMarkdownContent, category, onUpdate, router]
  );

  useEffect(() => {
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    if (autosaveNotes && isEditing && hasUnsavedChanges) {
      autosaveTimeoutRef.current = setTimeout(() => {
        setStatus((prev) => ({ ...prev, isAutoSaving: true }));
        const isAutosave = autosaveNotes ? true : false;
        handleSave(isAutosave).finally(() =>
          setStatus((prev) => ({ ...prev, isAutoSaving: false }))
        );
      }, 5000);
    }
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [autosaveNotes, isEditing, hasUnsavedChanges, handleSave]);

  useEffect(() => {
    const guard = () => {
      if (hasUnsavedChanges) {
        setShowUnsavedChangesModal(true);
        return false;
      }
      return true;
    };
    registerNavigationGuard(guard);
    return () => unregisterNavigationGuard();
  }, [hasUnsavedChanges, registerNavigationGuard, unregisterNavigationGuard]);

  const handleEditorContentChange = (content: string, isMarkdown: boolean) => {
    setEditorContent(content);
    setIsMarkdownMode(isMarkdown);
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setIsEditing(false);
    setTitle(note.title);
    setCategory(note.category || "Uncategorized");
    setEditorContent(convertMarkdownToHtml(note.content || ""));
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${note.title}"?`)) {
      const formData = new FormData();
      formData.append("id", note.id);
      formData.append("category", note.category || "");
      await deleteNote(formData);
      onDelete?.(note.id);
      onBack();
    }
  };

  const handleUnsavedChangesSave = () =>
    handleSave().then(() => executePendingNavigation());
  const handleUnsavedChangesDiscard = () => executePendingNavigation();

  return {
    title,
    setTitle,
    category,
    setCategory,
    editorContent,
    isEditing,
    setIsEditing,
    status,
    hasUnsavedChanges,
    handleEdit,
    handleCancel,
    handleSave,
    handleDelete,
    handleEditorContentChange,
    derivedMarkdownContent,
    showUnsavedChangesModal,
    setShowUnsavedChangesModal,
    handleUnsavedChangesSave,
    handleUnsavedChangesDiscard,
    isMarkdownMode,
    setIsMarkdownMode,
  };
};
