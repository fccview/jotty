"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  ClipboardList,
  Users,
  Hash,
  Check,
  Globe,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Checklist, RecurrenceRule } from "@/app/_types";
import { isMobileDevice } from "@/app/_utils/global-utils";
import { useChecklist } from "../../../../../_hooks/useChecklist";
import { useSharing } from "@/app/_hooks/useSharing";
import { AddItemWithRecurrenceModal } from "@/app/_components/GlobalComponents/Modals/ChecklistModals/AddItemWithRecurrenceModal";
import { useAppMode } from "@/app/_providers/AppModeProvider";

interface ChecklistHeadingProps {
  checklist: Checklist;
  onSubmit: (text: string, recurrence?: RecurrenceRule) => void;
  onBulkSubmit?: () => void;
  isLoading?: boolean;
  autoFocus?: boolean;
  focusKey?: number;
  placeholder?: string;
  submitButtonText?: string;
}

export const ChecklistHeading = ({
  checklist,
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

  const { handleCopyId, copied } = useChecklist({
    list: checklist,
    onUpdate: () => {},
  });
  const { sharingStatus } = useSharing({
    itemId: checklist.id,
    itemType: "checklist",
    itemOwner: checklist.owner || "",
    onClose: () => {},
    enabled: true,
    itemTitle: checklist.title,
    itemCategory: checklist.category,
    isOpen: true,
  });

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
      <div className="p-4 lg:p-6 border-b border-border bg-gradient-to-r from-background to-muted/20">
        <div className="lg:mb-6">
          <div className="flex items-center gap-3 lg:mb-3">
            <h2 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight">
              {checklist.title}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyId}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              title={`Copy ID: ${checklist.id}`}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Hash className="h-3 w-3" />
              )}
            </Button>
            {sharingStatus?.isPubliclyShared && (
              <Globe className="h-3 w-3 text-primary" />
            )}
            {sharingStatus?.isShared && !sharingStatus.isPubliclyShared && (
              <Users className="h-3 w-3 text-primary" />
            )}
          </div>
        </div>

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
                  className={`px-4 lg:px-6 shadow-sm ${
                    user?.enableRecurrence === "enable"
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
