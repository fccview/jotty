"use client";

import { useTranslations } from "next-intl";
import { JottyIcon } from "./CustomIcons/JottyIcon";

export const IndexingRelations = ({ compact = false }: { compact?: boolean }) => {
  const t = useTranslations();

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 text-muted-foreground ${
        compact ? "py-6" : "h-full min-h-[50vh]"
      }`}
    >
      <JottyIcon
        className={`${compact ? "h-10 w-10" : "h-16 w-16"} text-primary animate-pulse`}
        animated
        slower
      />
      <span className="text-md lg:text-sm">{t("relations.indexing")}</span>
    </div>
  );
};
