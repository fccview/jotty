"use client";

import { Add01Icon, FolderAddIcon } from "hugeicons-react";
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
          <Add01Icon className="h-4 w-4 mr-2" />
          {mode === Modes.CHECKLISTS ? t("checklists.newChecklist") : t("notes.newNote")}
        </Button>
        <Button
          onClick={(e) => {
            e.preventDefault();
            onOpenCategoryModal();
          }}
          variant="outline"
          size="sm"
        >
          <FolderAddIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
