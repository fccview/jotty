"use client";

import { useMemo } from "react";
import { ItemStub, ListSummary } from "@/app/_types";
import { getPriorityDotColor } from "@/app/_utils/kanban";
import { MINI_BOARD_ROWS } from "@/app/_utils/browse/list-summary-utils";
import { statusColor } from "@/app/_consts/kanban";
import { SMALL_RADIUS_CLASS } from "@/app/_consts/styling";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { cn } from "@/app/_utils/global-utils";
import { plainItemText } from "@/app/_utils/item-href-utils";

const LAYOUT = {
  full: { columns: 5, rows: MINI_BOARD_ROWS },
  compact: { columns: 4, rows: 2 },
};

const NO_PRIORITY = "transparent";

interface MiniBoardProps {
  summary: ListSummary;
  compact?: boolean;
}

const stubEdge = (item: ItemStub, fallback: string): string => {
  const dot = getPriorityDotColor(item.priority);
  return dot === NO_PRIORITY ? fallback : dot;
};

export const MiniBoard = ({ summary, compact = false }: MiniBoardProps) => {
  const abbreviate = useCompactNumber();
  const { columns, rows } = compact ? LAYOUT.compact : LAYOUT.full;

  const { shown, hidden } = useMemo(() => {
    const all = summary.columns;
    const visible = all.length > columns ? all.slice(0, columns - 1) : all;
    return { shown: visible, hidden: all.slice(visible.length) };
  }, [summary.columns, columns]);

  return (
    <div
      className="grid gap-1.5"
      style={{
        gridTemplateColumns: `repeat(${shown.length + (hidden.length ? 1 : 0)}, minmax(0, 1fr))`,
      }}
    >
      {shown.map(({ status, count, top }) => {
        const color = statusColor(status);

        return (
          <div
            key={status.id}
            className={cn("min-w-0 rounded-jotty bg-muted/50", compact ? "p-1" : "p-1.5")}
          >
            <div
              className={cn(
                "flex items-center gap-1 text-[10px] text-muted-foreground min-w-0",
                compact ? "mb-1" : "mb-1.5",
              )}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              {!compact && <span className="truncate">{status.label}</span>}
              <span className="ml-auto font-mono text-foreground">
                {abbreviate(count)}
              </span>
            </div>
            <div className="space-y-1">
              {top.slice(0, rows).map((item) => (
                <div
                  key={item.id}
                  title={plainItemText(item.text)}
                  className={cn(
                    "border border-border bg-card",
                    SMALL_RADIUS_CLASS,
                    compact
                      ? "h-2"
                      : "h-[18px] truncate px-1 text-[10px] leading-[16px] text-muted-foreground",
                  )}
                  style={{
                    borderLeft: `${compact ? 3 : 2}px solid ${stubEdge(item, color)}`,
                  }}
                >
                  {!compact && plainItemText(item.text)}
                </div>
              ))}
              {!count && (
                <div
                  className={cn(
                    "border border-dashed border-border",
                    SMALL_RADIUS_CLASS,
                    compact ? "h-2" : "h-[18px]",
                  )}
                />
              )}
              {count > rows && (
                <div className="text-center font-mono text-[9px] leading-3 text-muted-foreground">
                  +{abbreviate(count - rows)}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {hidden.length > 0 && (
        <div
          className="min-w-0 rounded-jotty border border-dashed border-border flex items-center justify-center font-mono text-[10px] text-muted-foreground"
          title={hidden.map(({ status }) => status.label).join(", ")}
        >
          +{hidden.length}
        </div>
      )}
    </div>
  );
};
