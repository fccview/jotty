"use client";

import { useTranslations } from "next-intl";
import { BrowsePage, Category, Checklist, SanitisedUser } from "@/app/_types";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { ListsBrowser } from "@/app/_components/FeatureComponents/Checklists/Parts/ListsBrowser";
import { BrowseScope } from "@/app/_consts/browse";

interface KanbanPageClientProps {
  initialPage: BrowsePage<Checklist>;
  categories: Category[];
  user: SanitisedUser | null;
}

export const KanbanPageClient = ({ initialPage, categories, user }: KanbanPageClientProps) => {
  const t = useTranslations();
  const compact = useCompactNumber();

  return (
    <ListsBrowser
      scope={BrowseScope.BOARDS}
      initialPage={initialPage}
      categories={categories}
      user={user}
      kickerOf={({ cards = 0, inProgress = 0 }, boards) =>
        t("browse.kanbanKicker", {
          cardsCount: cards,
          cards: compact(cards),
          boardsCount: boards,
          boards: compact(boards),
          inProgress: compact(inProgress),
        })
      }
    />
  );
};
