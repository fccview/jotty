"use client";

import { useState, useEffect, useRef } from "react";
import { Add01Icon } from "hugeicons-react";
import { RecurrenceRule } from "@/app/_types";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { RecurrenceSelector } from "@/app/_components/GlobalComponents/FormElements/RecurrenceSelector";
import { Input } from "../../FormElements/Input";

interface AddItemWithRecurrenceModalProps {
  initialItemText: string;
  onClose: () => void;
  onSubmit: (text: string, recurrence?: RecurrenceRule) => void;
  isLoading?: boolean;
}

export const AddItemWithRecurrenceModal = ({
  initialItemText,
  onClose,
  onSubmit,
  isLoading = false,
}: AddItemWithRecurrenceModalProps) => {
  const [text, setText] = useState(initialItemText || "");
  const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>();
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    textInputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    onSubmit(text.trim(), recurrence);
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Item with Recurrence"
      titleIcon={<Add01Icon className="h-5 w-5 text-primary" />}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Input
            id="item-text"
            ref={textInputRef}
            label="Recurring Item Text *"
            type="text"
            defaultValue={initialItemText}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter the text for the recurring item"
            required
            disabled={isLoading}
          />
        </div>

        <RecurrenceSelector
          value={recurrence}
          onChange={setRecurrence}
          disabled={isLoading}
        />

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !text.trim()}
            className="flex-1"
          >
            {isLoading ? "Adding..." : "Add Item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
