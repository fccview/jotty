import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  convertMarkdownToHtml,
  convertHtmlToMarkdownUnified,
  processMarkdownContent,
} from "@/app/_utils/markdown-utils";
import { useSettings } from "@/app/_utils/settings-store";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { deleteNote, updateNote } from "@/app/_server/actions/note";
import {
  buildCategoryPath,
  encodeCategoryPath,
  encodeId,
} from "@/app/_utils/global-utils";
import { Note } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { getUserByNote } from "../_server/actions/users";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAppMode();
  const isMinimalMode = user?.disableRichEditor === "enable";
  const defaultEditorIsMarkdown = user?.notesDefaultEditor === "markdown";
  const [title, setTitle] = useState(note.title);
  const [category, setCategory] = useState(note.category || "Uncategorized");
  const [editorContent, setEditorContent] = useState(() => {
    const { contentWithoutMetadata } = extractYamlMetadata(note.content || "");
    if (note.encrypted) {
      return contentWithoutMetadata;
    }
    if (isMinimalMode) {
      return contentWithoutMetadata;
    }
    if (defaultEditorIsMarkdown) {
      return contentWithoutMetadata;
    }
    return convertMarkdownToHtml(contentWithoutMetadata);
  });
  const [isMarkdownMode, setIsMarkdownMode] = useState(
    isMinimalMode || defaultEditorIsMarkdown
  );
  const [isPrinting, setIsPrinting] = useState(false);
  const notesDefaultMode = user?.notesDefaultMode || "view";

  const [isEditing, setIsEditing] = useState(() => {
    const editor = searchParams?.get("editor");

    return notesDefaultMode === "edit" || editor === "true" ? true : false;
  });
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
        : convertHtmlToMarkdownUnified(editorContent, user?.tableSyntax),
    [editorContent, isMarkdownMode, user?.tableSyntax]
  );

  useEffect(() => {
    setTitle(note.title);
    setCategory(note.category || "Uncategorized");

    const { contentWithoutMetadata } = extractYamlMetadata(note.content || "");

    if (note.encrypted) {
      setEditorContent(contentWithoutMetadata);
      setIsMarkdownMode(true);
    } else if (isMinimalMode) {
      setEditorContent(contentWithoutMetadata);
      setIsMarkdownMode(true);
    } else if (defaultEditorIsMarkdown) {
      setEditorContent(contentWithoutMetadata);
      setIsMarkdownMode(true);
    } else {
      setEditorContent(convertMarkdownToHtml(contentWithoutMetadata));
      setIsMarkdownMode(false);
    }

    if (searchParams?.get("editor") !== "true") {
      setIsEditing(false);
      setHasUnsavedChanges(false);
    }
  }, [note, isMinimalMode, defaultEditorIsMarkdown]);

  useEffect(() => {
    if (notesDefaultMode !== "edit" && !isEditing) return;
    const { contentWithoutMetadata: noteContentWithoutYaml } =
      extractYamlMetadata(note.content || "");
    const contentChanged =
      derivedMarkdownContent.trim() !== noteContentWithoutYaml.trim();
    const titleChanged = title !== note.title;
    const categoryChanged = category !== (note.category || "Uncategorized");
    setHasUnsavedChanges(contentChanged || titleChanged || categoryChanged);
  }, [derivedMarkdownContent, title, category, note, isEditing]);

  const handleSave = useCallback(
    async (autosaveNotes = false) => {
      const owner = await getUserByNote(
        note.id,
        note.category || "Uncategorized"
      );
      const useAutosave = autosaveNotes ? true : false;
      if (!useAutosave) {
        setStatus((prev) => ({ ...prev, isSaving: true }));
      }
      const { contentWithoutMetadata: cleanContent } = extractYamlMetadata(
        derivedMarkdownContent
      );

      const formData = new FormData();
      formData.append("id", note.id);
      formData.append("title", useAutosave ? note.title : title);
      formData.append("content", cleanContent);
      formData.append("category", useAutosave ? (note.category || "Uncategorized") : category);
      formData.append("originalCategory", note.category || "Uncategorized");
      formData.append("user", owner.data?.username || "");
      formData.append("uuid", note.uuid || "");

      const result = await updateNote(formData, useAutosave);

      if (useAutosave && result.success && result.data) {
        return;
      } else {
        setStatus((prev) => ({ ...prev, isSaving: false }));
      }

      if (result.success && result.data) {
        onUpdate(result.data);
        setIsEditing(false);

        const categoryPath = buildCategoryPath(
          category || "Uncategorized",
          result.data.id
        );
        router.push(`/note/${categoryPath}`);
      }
    },
    [note.id, title, derivedMarkdownContent, category, onUpdate, router]
  );

  useEffect(() => {
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    const isEditMode = notesDefaultMode === "edit" || isEditing;

    if (
      user?.notesAutoSaveInterval !== 0 &&
      autosaveNotes &&
      isEditMode &&
      hasUnsavedChanges
    ) {
      autosaveTimeoutRef.current = setTimeout(() => {
        setStatus((prev) => ({ ...prev, isAutoSaving: true }));
        const isAutosave = autosaveNotes ? true : false;
        handleSave(isAutosave).finally(() => {
          setStatus((prev) => ({ ...prev, isAutoSaving: false }));
          setHasUnsavedChanges(false);
        });
      }, user?.notesAutoSaveInterval || 5000);
    }
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [
    autosaveNotes,
    isEditing,
    hasUnsavedChanges,
    handleSave,
    user?.notesDefaultMode,
  ]);

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
    const { contentWithoutMetadata } = extractYamlMetadata(note.content || "");
    if (isMinimalMode) {
      setEditorContent(contentWithoutMetadata);
      setIsMarkdownMode(true);
    } else if (defaultEditorIsMarkdown) {
      setEditorContent(contentWithoutMetadata);
      setIsMarkdownMode(true);
    } else {
      setEditorContent(convertMarkdownToHtml(contentWithoutMetadata));
      setIsMarkdownMode(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${note.title}"?`)) {
      const formData = new FormData();
      formData.append("id", note.id);
      formData.append("category", note.category || "");
      await deleteNote(formData);
      onDelete?.(note.id);
      router.refresh();
      onBack();
    }
  };

  const handleUnsavedChangesSave = () =>
    handleSave().then(() => executePendingNavigation());
  const handleUnsavedChangesDiscard = () => executePendingNavigation();

  const handlePrint = () => {
    setIsPrinting(true);

    const categoryUrlPath =
      note.category && note.category !== "Uncategorized"
        ? encodeCategoryPath(note.category) + "/"
        : "";

    const printUrl = `/public/note/${categoryUrlPath}${encodeId(
      note.id
    )}?view_mode=print`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";

    const cleanup = () => {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        setIsPrinting(false);
      }, 100);
    };

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        console.error("Failed to get iframe content window.");
        cleanup();
        return;
      }
      win.addEventListener("afterprint", cleanup);
      try {
        win.focus();
        win.print();
      } catch (e) {
        console.error("Failed to call print() on iframe:", e);
        cleanup();
      }
    };

    iframe.onerror = () => {
      console.error("Failed to load print iframe. Check URL:", printUrl);
      cleanup();
    };

    iframe.src = printUrl;
    document.body.appendChild(iframe);
  };

  return {
    title,
    setTitle,
    category,
    setCategory,
    editorContent,
    setEditorContent,
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
    handlePrint,
    isPrinting,
    setIsPrinting,
  };
};
