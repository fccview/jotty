"use client";

import { useTranslations } from "next-intl";
import { BrowsePage, Category, Checklist, SanitisedUser } from "@/app/_types";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { ListsBrowser } from "./Parts/ListsBrowser";
import { BrowseScope } from "@/app/_consts/browse";

interface ChecklistsPageClientProps {
  initialPage: BrowsePage<Checklist>;
  categories: Category[];
  user: SanitisedUser | null;
}

export const ChecklistsPageClient = ({
  initialPage,
  categories,
  user,
}: ChecklistsPageClientProps) => {
  const t = useTranslations();
  const compact = useCompactNumber();

  return (
    <ListsBrowser
      scope={BrowseScope.CHECKLISTS}
      initialPage={initialPage}
      categories={categories}
      user={user}
      kickerOf={({ done = 0, total = 0 }) =>
        t("browse.checklistsKicker", { done: compact(done), total: compact(total) })
      }
    />
  );
};
