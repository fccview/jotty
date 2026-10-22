"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Category, Checklist, SanitisedUser } from "@/app/_types";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { listSummaryOf } from "@/app/_utils/browse/list-summary-utils";
import { ListsBrowser } from "@/app/_components/FeatureComponents/Checklists/Parts/ListsBrowser";
import { BrowseScope } from "@/app/_consts/browse";

interface KanbanPageClientProps {
  initialLists: Checklist[];
  categories: Category[];
  user: SanitisedUser | null;
}

export const KanbanPageClient = ({ initialLists, categories, user }: KanbanPageClientProps) => {
  const t = useTranslations();
  const compact = useCompactNumber();

  const { cards, inProgress } = useMemo(
    () =>
      initialLists.reduce(
        (sum, list) => {
          const summary = listSummaryOf(list);
          return { cards: sum.cards + summary.cards, inProgress: sum.inProgress + summary.inProgress };
        },
        { cards: 0, inProgress: 0 },
      ),
    [initialLists],
  );

  return (
    <ListsBrowser
      scope={BrowseScope.BOARDS}
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
