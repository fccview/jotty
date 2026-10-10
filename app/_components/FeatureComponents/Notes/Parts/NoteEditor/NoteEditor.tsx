"use client";

import { Note, Category } from "@/app/_types";
import { UnsavedChangesModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/UnsavedChangesModal";
import { useNoteEditor } from "@/app/_hooks/useNoteEditor";
import { NoteEditorHeader } from "@/app/_components/FeatureComponents/Notes/Parts/NoteEditor/NoteEditorHeader";
import { NoteEditorContent } from "@/app/_components/FeatureComponents/Notes/Parts/NoteEditor/NoteEditorContent";
import { useLayoutEffect, useRef, type SyntheticEvent } from "react";
import { TableOfContents } from "../TableOfContents";
import { useSearchParams } from "next/navigation";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { useNotesStore } from "@/app/_utils/notes-store";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { NoteQuickBar } from "@/app/_components/FeatureComponents/Notes/Parts/NoteEditor/NoteQuickBar";

export interface NoteEditorProps {
  note: Note;
  categories: Category[];
  viewModel: ReturnType<typeof useNoteEditor>;
  onBack: () => void;
  onClone?: () => void;
}

const NOTE_BODY = ".ProseMirror, .prose";
const BLANK_TEXT = /[\s\u200b]/g;
const SCROLL_EVENT = "scroll";
const SNAP_X = 8;
const SNAP_Y = 20;

const rectAt = (body: Element, offset: number) => {
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const chars = (node.textContent || "").matchAll(/[^\s\u200b]/g);
    for (let char = chars.next(); !char.done; char = chars.next()) {
      if (offset-- > 0) continue;
      const range = document.createRange();
      range.setStart(node, char.value.index);
      range.setEnd(node, char.value.index + 1);
      return range.getBoundingClientRect();
    }
  }
  return null;
};

export const NoteEditor = ({
  note,
  categories,
  viewModel,
  onBack,
  onClone,
}: NoteEditorProps) => {
  const { permissions } = usePermissions();
  const isOwner = permissions?.isOwner || false;
  const { showTOC, setShowTOC } = useNotesStore();
  const decryptModalRef = useRef<(() => void) | null>(null);
  const viewModalRef = useRef<(() => void) | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const restoring = useRef(false);
  const position = useRef<{ offset: number; y: number } | null>(null);

  const remember = ({ type }: SyntheticEvent) => {
    if (type !== SCROLL_EVENT) restoring.current = false;
    if (restoring.current) return;
    const pane = contentRef.current;
    const body = pane?.querySelector(NOTE_BODY);
    if (!body || !pane) return;
    const frame = pane.getBoundingClientRect();
    const rect = body.getBoundingClientRect();
    const x = rect.left + parseFloat(getComputedStyle(body).paddingLeft) + SNAP_X;
    const y = Math.min(frame.bottom, rect.bottom) - SNAP_Y;
    const caret = document.caretPositionFromPoint?.(x, y);
    const hit = caret ? null : document.caretRangeFromPoint?.(x, y);
    const node = caret?.offsetNode ?? hit?.startContainer;
    if (!node || !body.contains(node)) return;
    const prefix = document.createRange();
    prefix.selectNodeContents(body);
    prefix.setEnd(node, caret?.offset ?? hit?.startOffset ?? 0);
    const offset = prefix.toString().replace(BLANK_TEXT, "").length;
    const bounds = caret?.getClientRect() ?? hit?.getBoundingClientRect();
    if (bounds?.height) position.current = { offset, y: bounds.top };
  };

  useLayoutEffect(() => {
    const pane = contentRef.current;
    const saved = position.current;
    if (!pane || !saved) return;
    restoring.current = true;
    const resize = new ResizeObserver(() => {
      if (!restoring.current) return;
      const body = pane.querySelector<HTMLElement>(NOTE_BODY);
      const rect = body && rectAt(body, saved.offset);
      if (!body || !rect) return;
      const top = pane.scrollTop + rect.top - saved.y;
      const needed = top - (pane.scrollHeight - pane.clientHeight);
      if (needed > 0 && body.scrollHeight > pane.clientHeight) {
        body.style.paddingBottom = `${parseFloat(getComputedStyle(body).paddingBottom) + needed}px`;
      }
      pane.scrollTop = top;
    });
    resize.observe(pane);
    if (pane.firstElementChild) resize.observe(pane.firstElementChild);
    return () => resize.disconnect();
  }, [viewModel.isEditorVisible]);
  const { user } = useAppMode();
  const searchParams = useSearchParams();
  const _isEditMode =
    viewModel.isEditing ||
    user?.notesDefaultMode === "edit" ||
    searchParams?.get("editor") === "true";

  return (
    <NoteQuickBar active={viewModel.isEditorVisible}>
      <div
        className="flex-1 flex flex-col overflow-hidden bg-background h-full"
        onScrollCapture={remember}
        onPointerDownCapture={remember}
        onKeyDownCapture={remember}
        onWheelCapture={remember}
      >
        <NoteEditorHeader
          note={note}
          categories={categories}
          isOwner={isOwner}
          onBack={onBack}
          onClone={onClone}
          viewModel={viewModel}
          showTOC={showTOC}
          setShowTOC={setShowTOC}
          onOpenDecryptModal={decryptModalRef}
          onOpenViewModal={viewModalRef}
        />

        <div className="flex flex-1 w-full relative min-h-0">
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto jotty-scrollable-content jotty-quick-nav-gutter min-h-0"
          >
            <NoteEditorContent
              isEditorVisible={viewModel.isEditorVisible}
              noteContent={note.content}
              editorContent={viewModel.editorContent}
              onEditorContentChange={viewModel.handleEditorContentChange}
              onRemoteContentChange={viewModel.handleRemoteContentChange}
              noteId={note.uuid}
              encrypted={note.encrypted}
              onOpenDecryptModal={() => decryptModalRef.current?.()}
              onOpenViewModal={() => viewModalRef.current?.()}
              />
          </div>

          {showTOC && (
            <div className="w-64 border-l border-border">
              <TableOfContents
                content={
                  _isEditMode
                    ? viewModel.derivedMarkdownContent
                    : note.content || ""
                }
                isEditing={_isEditMode}
              />
            </div>
          )}
        </div>

        <UnsavedChangesModal
          isOpen={viewModel.showUnsavedChangesModal}
          onClose={() => viewModel.setShowUnsavedChangesModal(false)}
          onSave={viewModel.handleUnsavedChangesSave}
          onDiscard={viewModel.handleUnsavedChangesDiscard}
          noteTitle={note.title}
        />
      </div>
    </NoteQuickBar>
  );
};
