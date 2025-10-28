"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, ClipboardList, Users, Hash, Check, Globe } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Checklist } from "@/app/_types";
import { buildCategoryPath, isMobileDevice } from "@/app/_utils/global-utils";
import { useChecklist } from "../../../../../_hooks/useChecklist";
import { useSharing } from "@/app/_hooks/useSharing";
import { useRouter } from "next/navigation";

interface ChecklistHeadingProps {
  checklist: Checklist;
  onSubmit: (text: string) => void;
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
  const inputRef = useRef<HTMLInputElement>(null);

  const { handleCopyId, copied } = useChecklist({
    list: checklist,
    onUpdate: () => { },
  });

  const { sharingStatus } = useSharing({
    itemId: checklist.id,
    itemType: "checklist",
    itemOwner: checklist.owner || "",
    onClose: () => { },
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

  useEffect(() => {
    if (autoFocus && inputRef.current && !isMobileDevice()) {
      inputRef.current.focus();
    }
  }, [focusKey, autoFocus]);

  return (
    <>
      <div className="lg:p-6 border-b border-border bg-gradient-to-r from-background to-muted/20">
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
              <Button
                type="submit"
                size="lg"
                disabled={isLoading || !newItemText.trim()}
                className="px-4 lg:px-6 shadow-sm"
              >
                <Plus className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">{submitButtonText}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
