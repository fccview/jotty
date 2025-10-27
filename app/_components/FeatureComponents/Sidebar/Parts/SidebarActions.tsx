"use client";

import { Plus, FolderPlus } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { AppMode } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { useTranslations } from "next-intl";
interface SidebarActionsProps {
  mode: AppMode;
  onOpenCreateModal: (initialCategory?: string) => void;
  onOpenCategoryModal: () => void;
}

export const SidebarActions = ({
  mode,
  onOpenCreateModal,
  onOpenCategoryModal,
}: SidebarActionsProps) => {
  const t = useTranslations();
  return (
    <div className="px-4 pt-4 pb-2 lg:pt-4 lg:pb-4 space-y-2 border-t border-border">
      <div className="flex gap-2 items-center">
        <Button
          onClick={(e) => {
            e.preventDefault();
            onOpenCreateModal();
          }}
          size="sm"
          className="flex-1"
        >
          <Plus className="h-4 w-4 mr-2" />
          {mode === Modes.CHECKLISTS ? t("checklists.new_checklist") : t("notes.new_note")}
        </Button>
        <Button
          onClick={(e) => {
            e.preventDefault();
            onOpenCategoryModal();
          }}
          variant="outline"
          size="sm"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
