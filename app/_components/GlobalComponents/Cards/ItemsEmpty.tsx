"use client";

import { ComponentType } from "react";
import { useTranslations } from "next-intl";
import { CheckmarkSquare04Icon, File02Icon, TaskDaily01Icon } from "hugeicons-react";
import { EmptyActions, EmptyState } from "./EmptyState";
import { EmptyIllustration, EmptyIllustrations } from "./Parts/EmptyIllustration";

interface EmptyCopy {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  createLabel: string;
  filteredTitle: string;
  filteredDescription: string;
}

const EMPTY_COPY: Record<EmptyIllustrations, EmptyCopy> = {
  [EmptyIllustrations.NOTES]: {
    icon: File02Icon,
    title: "notes.noNotesYet",
    description: "notes.createFirstNote",
    createLabel: "notes.createNewNote",
    filteredTitle: "notes.noNotesFound",
    filteredDescription: "notes.tryAdjustingFilters",
  },
  [EmptyIllustrations.CHECKLISTS]: {
    icon: CheckmarkSquare04Icon,
    title: "checklists.noChecklistsYet",
    description: "checklists.createFirstChecklist",
    createLabel: "checklists.newChecklist",
    filteredTitle: "checklists.noChecklistsFound",
    filteredDescription: "checklists.tryAdjustingFiltersChecklist",
  },
  [EmptyIllustrations.BOARDS]: {
    icon: TaskDaily01Icon,
    title: "kanban.noBoardsYet",
    description: "kanban.createFirstBoard",
    createLabel: "kanban.newBoard",
    filteredTitle: "kanban.noBoards",
    filteredDescription: "kanban.tryAdjustingFilters",
  },
};

interface ItemsEmptyProps {
  kind: EmptyIllustrations;
  action: EmptyActions;
  onAction: () => void;
}

export const ItemsEmpty = ({ kind, action, onAction }: ItemsEmptyProps) => {
  const t = useTranslations();
  const copy = EMPTY_COPY[kind];

  if (action === EmptyActions.CLEAR) {
    return (
      <EmptyState
        action={EmptyActions.CLEAR}
        icon={copy.icon}
        title={t(copy.filteredTitle)}
        description={t(copy.filteredDescription)}
        buttonText={t("common.clear")}
        onButtonClick={onAction}
      />
    );
  }

  return (
    <EmptyState
      illustration={<EmptyIllustration variant={kind} />}
      title={t(copy.title)}
      description={t(copy.description)}
      buttonText={t(copy.createLabel)}
      onButtonClick={onAction}
    />
  );
};
