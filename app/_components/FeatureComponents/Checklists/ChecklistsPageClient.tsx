"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Category, Checklist, SanitisedUser } from "@/app/_types";
import { listSummaryOf } from "@/app/_utils/browse/list-summary-utils";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { ListsBrowser } from "./Parts/ListsBrowser";
import { BrowseScope } from "@/app/_consts/browse";

interface ChecklistsPageClientProps {
  initialLists: Checklist[];
  categories: Category[];
  user: SanitisedUser | null;
}

export const ChecklistsPageClient = ({
  initialLists,
  categories,
  user,
}: ChecklistsPageClientProps) => {
  const t = useTranslations();
  const compact = useCompactNumber();

  const { done, total } = useMemo(
    () =>
      initialLists
        .filter((list) => list.type === "simple")
        .reduce(
          (sum, list) => {
            const counts = listSummaryOf(list);
            return { done: sum.done + counts.completed, total: sum.total + counts.total };
          },
          { done: 0, total: 0 },
        ),
    [initialLists],
  );

  return (
    <ListsBrowser
      scope={BrowseScope.CHECKLISTS}
      lists={initialLists}
      categories={categories}
      user={user}
      kicker={t("browse.checklistsKicker", { done: compact(done), total: compact(total) })}
    />
  );
};
