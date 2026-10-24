"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Modal, ModalVariant } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { MermaidRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/MermaidRenderer";

interface MermaidEditorModalProps {
  content: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

const PREVIEW_DELAY = 300;

const placeCaretAtEnd = (textarea: HTMLTextAreaElement | null) => {
  if (!textarea || textarea.dataset.caretPlaced) return;
  textarea.dataset.caretPlaced = "true";
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
};
const INDENT = "    ";
const ENTER = "Enter";
const TAB = "Tab";

export const MermaidEditorModal = ({ content, onSave, onClose }: MermaidEditorModalProps) => {
  const t = useTranslations();
  const [draft, setDraft] = useState(content);
  const [preview, setPreview] = useState(content);

  useEffect(() => {
    const timer = window.setTimeout(() => setPreview(draft), PREVIEW_DELAY);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const saveAndClose = () => {
    if (draft !== content) onSave(draft);
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === ENTER) {
      event.preventDefault();
      saveAndClose();
      return;
    }
    if (event.key !== TAB || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    const target = event.currentTarget;
    const { selectionStart, selectionEnd, value } = target;
    const next = `${value.slice(0, selectionStart)}${INDENT}${value.slice(selectionEnd)}`;
    setDraft(next);
    requestAnimationFrame(() => target.setSelectionRange(selectionStart + INDENT.length, selectionStart + INDENT.length));
  };

  return (
    <Modal isOpen onClose={saveAndClose} title={t("editor.editDiagram")} variant={ModalVariant.WORKSPACE} flush>
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            className="h-full min-h-[240px] w-full resize-none rounded border border-border bg-muted p-3 font-mono text-sm"
            placeholder={t("editor.enterMermaidCode")}
            aria-label={t("editor.mermaidDiagram")}
            spellCheck={false}
            autoFocus
            ref={placeCaretAtEnd}
          />
          <div className="min-h-[240px] overflow-auto rounded border border-border bg-background p-3" aria-live="polite">
            <MermaidRenderer code={preview} className="my-0" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={saveAndClose}>{t("common.save")}</Button>
        </div>
      </div>
    </Modal>
  );
};
