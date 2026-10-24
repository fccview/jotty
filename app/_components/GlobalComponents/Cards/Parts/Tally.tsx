"use client";

import { useTranslations } from "next-intl";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";

export const Tally = ({ done, total }: { done: number; total: number }) => {
  const t = useTranslations();
  const compact = useCompactNumber();

  return (
    <span
      className="font-mono text-sm font-medium text-foreground shrink-0 whitespace-nowrap"
      title={t("browse.tickedOf", { done, total })}
    >
      {compact(done)}
      <span className="text-muted-foreground">/{compact(total)}</span>
    </span>
  );
};
