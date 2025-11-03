"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { RecurrenceRule } from "@/app/_types";
import { isMobileDevice } from "@/app/_utils/global-utils";
import { AddItemWithRecurrenceModal } from "@/app/_components/GlobalComponents/Modals/ChecklistModals/AddItemWithRecurrenceModal";
import { useAppMode } from "@/app/_providers/AppModeProvider";

interface ChecklistHeadingProps {
  onSubmit: (text: string, recurrence?: RecurrenceRule) => void;
  onBulkSubmit?: () => void;
  isLoading?: boolean;
  autoFocus?: boolean;
  focusKey?: number;
  placeholder?: string;
  submitButtonText?: string;
}

export const ChecklistHeading = ({
  onSubmit,
  onBulkSubmit,
  isLoading = false,
  autoFocus = false,
  focusKey = 0,
  placeholder = "Add new item...",
  submitButtonText = "Add Item",
}: ChecklistHeadingProps) => {
  const [newItemText, setNewItemText] = useState("");
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAppMode();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    onSubmit(newItemText.trim());
    setNewItemText("");
  };

  const handleRecurrenceSubmit = (
    text: string,
    recurrence?: RecurrenceRule
  ) => {
    onSubmit(text, recurrence);
  };

  useEffect(() => {
    if (autoFocus && inputRef.current && !isMobileDevice()) {
      inputRef.current.focus();
    }
  }, [focusKey, autoFocus]);

  return (
    <>
      <div className="lg:p-6 lg:border-b border-border bg-gradient-to-r from-background to-muted/20">
        <div className="fixed bottom-[64px] left-0 right-0 lg:relative lg:bottom-auto lg:left-auto lg:right-auto bg-background border-t lg:border-t-0 border-border p-4 lg:p-0 z-20 lg:z-auto items-center">
          <form
            onSubmit={handleSubmit}
            className="flex gap-3 lg:flex-row lg:items-center"
          >
            <input
              ref={inputRef}
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-4 w-[60%] lg:w-auto py-3 border border-input bg-background rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-all duration-200 shadow-sm"
              disabled={isLoading}
            />
            <div className="flex gap-2 lg:gap-3 items-center">
              {onBulkSubmit && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={onBulkSubmit}
                  disabled={isLoading}
                  title="Bulk add items"
                  className="px-3 lg:px-4 shadow-sm"
                >
                  <ClipboardList className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">Bulk</span>
                </Button>
              )}
              <div className="flex items-center">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading || !newItemText.trim()}
                  className={`px-4 lg:px-6 shadow-sm ${user?.enableRecurrence === "enable"
                    ? "rounded-tr-none rounded-br-none"
                    : ""
                    }`}
                >
                  <Plus className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">{submitButtonText}</span>
                </Button>

                {user?.enableRecurrence === "enable" && (
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => setShowRecurrenceModal(true)}
                    disabled={isLoading || !newItemText.trim()}
                    title="Add recurring item"
                    className="px-3 lg:px-4 shadow-sm border-l-2 border-border rounded-tl-none rounded-bl-none"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {showRecurrenceModal && user?.enableRecurrence === "enable" && (
        <AddItemWithRecurrenceModal
          initialItemText={newItemText.trim()}
          onClose={() => setShowRecurrenceModal(false)}
          onSubmit={handleRecurrenceSubmit}
          isLoading={isLoading}
        />
      )}
    </>
  );
};
