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
    <div className="p-2 space-y-2 border-t border-border">
      <div className="flex gap-2 items-center">
        <Button
          onClick={(e) => {
            e.preventDefault();
            onOpenCreateModal();
          }}
          size="sm"
          className="flex-1 h-14 rounded-jotty text-md lg:text-sm px-8 lg:h-9 lg:rounded-jotty lg:px-3"
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
          className="h-14 rounded-jotty px-8 lg:h-9 lg:rounded-jotty lg:px-3 text-md lg:text-sm"
          aria-label={t("common.newCategory")}
        >
          <FolderAddIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
