"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Category, Checklist, SanitisedUser } from "@/app/_types";
import { TaskStatus } from "@/app/_types/enums";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { ListsBrowser } from "@/app/_components/FeatureComponents/Checklists/Parts/ListsBrowser";

interface KanbanPageClientProps {
  initialLists: Checklist[];
  categories: Category[];
  user: SanitisedUser | null;
}

export const KanbanPageClient = ({ initialLists, categories, user }: KanbanPageClientProps) => {
  const t = useTranslations();
  const compact = useCompactNumber();

  const { cards, inProgress } = useMemo(() => {
    const items = initialLists.flatMap((list) => list.items.filter((item) => !item.isArchived));
    return {
      cards: items.length,
      inProgress: items.filter((item) => item.status === TaskStatus.IN_PROGRESS).length,
    };
  }, [initialLists]);

  return (
    <ListsBrowser
      isBoards
      lists={initialLists}
      categories={categories}
      user={user}
      kicker={t("browse.kanbanKicker", {
        cardsCount: cards,
        cards: compact(cards),
        boardsCount: initialLists.length,
        boards: compact(initialLists.length),
        inProgress: compact(inProgress),
      })}
    />
  );
};
