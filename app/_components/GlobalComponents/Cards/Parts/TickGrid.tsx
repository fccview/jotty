"use client";

import { useTranslations } from "next-intl";
import { ListSummary } from "@/app/_types";
import { TICK_COLUMNS } from "@/app/_utils/browse/list-summary-utils";
import { cn } from "@/app/_utils/global-utils";
import { TICK_RADIUS_CLASS } from "@/app/_consts/styling";

export const TickGrid = ({ summary }: { summary: ListSummary }) => {
  const t = useTranslations();
  const { total, completed: done } = summary;
  const { cells, bucket } = summary.ticks;

  if (!total) {
    return <div className="h-[10px] rounded-jotty border border-dashed border-border" />;
  }

  return (
    <div>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${TICK_COLUMNS}, minmax(0, 15px))` }}
        aria-label={t("browse.tickedOf", { done, total })}
      >
        {cells.map((cell) => {
          const percent = Math.round((cell.done / cell.size) * 100);
          return (
            <span
              key={cell.key}
              title={cell.label || t("browse.tickedOf", { done: cell.done, total: cell.size })}
              className={cn(
                "block aspect-square",
                TICK_RADIUS_CLASS,
                percent === 100 ? "bg-primary" : "border border-foreground/20",
              )}
              style={
                percent > 0 && percent < 100
                  ? {
                      background: `linear-gradient(to top, rgb(var(--primary)) ${percent}%, rgb(var(--primary) / 0.12) ${percent}%)`,
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
      {bucket > 1 && (
        <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
          {t("browse.bucket", { count: bucket })}
        </p>
      )}
    </div>
  );
};
