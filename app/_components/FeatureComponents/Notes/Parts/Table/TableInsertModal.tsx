"use client";

import { useState } from "react";
import { Editor } from "@tiptap/react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";

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
    <Modal isOpen={isOpen} onClose={onClose} title="Insert Table">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Rows
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-background border border-input rounded-jotty text-foreground focus:outline-none focus:ring-none focus:ring-ring focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Columns
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-background border border-input rounded-jotty text-foreground focus:outline-none focus:ring-none focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 border-border text-foreground hover:bg-muted/50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleInsert}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Insert Table
          </Button>
        </div>
      </div>
    </Modal>
  );
};
