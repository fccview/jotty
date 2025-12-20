"use client";

import { useState } from "react";
import { Editor } from "@tiptap/react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { useTranslations } from "next-intl";

interface TableInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor;
}

export const TableInsertModal = ({
  isOpen,
  onClose,
  editor,
}: TableInsertModalProps) => {
  const t = useTranslations();
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  const handleInsert = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('editor.insertTable')}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="rows"
            name="rows"
            label="Rows"
            type="number"
            min="1"
            max="10"
            value={rows.toString()}
            onChange={(e) => setRows(parseInt(e.target.value) || 1)}
          />
          <Input
            id="cols"
            name="cols"
            label="Columns"
            type="number"
            min="1"
            max="10"
            value={cols.toString()}
            onChange={(e) => setCols(parseInt(e.target.value) || 1)}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 border-border text-foreground hover:bg-muted/50"
          >{t('common.cancel')}</Button>
          <Button
            type="button"
            onClick={handleInsert}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >{t('editor.insertTable')}</Button>
        </div>
      </div>
    </Modal>
  );
};
