"use client";

import { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { RecurrenceRule } from "@/app/_types";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { RecurrenceSelector } from "@/app/_components/GlobalComponents/FormElements/RecurrenceSelector";

interface AddItemWithRecurrenceModalProps {
  onClose: () => void;
  onSubmit: (text: string, recurrence?: RecurrenceRule) => void;
  isLoading?: boolean;
}

export const AddItemWithRecurrenceModal = ({
  onClose,
  onSubmit,
  isLoading = false,
}: AddItemWithRecurrenceModalProps) => {
  const [text, setText] = useState("");
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
      titleIcon={<Plus className="h-5 w-5 text-primary" />}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Item Text *
          </label>
          <input
            ref={textInputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g., Water Plants"
            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
