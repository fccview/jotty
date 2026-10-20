"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Item } from "@/app/_types";
import { isItemCompleted, leafItems } from "@/app/_utils/checklist-count-utils";
import { cn } from "@/app/_utils/global-utils";
import { plainItemText } from "@/app/_utils/item-href-utils";
import { TICK_RADIUS_CLASS } from "@/app/_consts/styling";

const COLUMNS = 16;
const ROWS = 3;

interface TickGridProps {
  items: Item[];
  type: string;
}

export const TickGrid = ({ items, type }: TickGridProps) => {
  const t = useTranslations();

  const { cells, bucket, done, total } = useMemo(() => {
    const leaves = leafItems(items);
    const size = Math.max(1, Math.ceil(leaves.length / (COLUMNS * ROWS)));
    const groups = Array.from(
      { length: Math.ceil(leaves.length / size) },
      (_, index) => leaves.slice(index * size, index * size + size),
    );

    return {
      bucket: size,
      total: leaves.length,
      done: leaves.filter((item) => isItemCompleted(item, type)).length,
      cells: groups.map((group) => ({
        key: group[0].id,
        label: group.length === 1 ? plainItemText(group[0].text) : "",
        done: group.filter((item) => isItemCompleted(item, type)).length,
        size: group.length,
      })),
    };
  }, [items, type]);

  if (!total) {
    return <div className="h-[10px] rounded-jotty border border-dashed border-border" />;
  }

  return (
    <div>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 15px))` }}
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
