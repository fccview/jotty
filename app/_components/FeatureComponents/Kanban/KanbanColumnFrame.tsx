"use client";

import { ReactNode, Ref, useMemo } from "react";
import { useTranslations } from "next-intl";
import { TaskDaily01Icon } from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";

const BORDER_ALPHA = 0.3;
const FILL_ALPHA = 0.05;
const HEX_RGB = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

const _tint = (color: string, alpha: number) => {
  const match = HEX_RGB.exec(color);
  if (!match) return color;
  const [r, g, b] = match.slice(1).map((part) => parseInt(part, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface KanbanColumnFrameProps {
  title: string;
  color: string;
  count: number;
  isEmpty: boolean;
  actions?: ReactNode;
  dropRef?: Ref<HTMLDivElement>;
  isOver?: boolean;
  padBottom?: number;
  children?: ReactNode;
}

export const KanbanColumnFrame = ({
  title,
  color,
  count,
  isEmpty,
  actions,
  dropRef,
  isOver = false,
  padBottom,
  children,
}: KanbanColumnFrameProps) => {
  const t = useTranslations();
  const { borderColor, bgColor } = useMemo(
    () => ({ borderColor: _tint(color, BORDER_ALPHA), bgColor: _tint(color, FILL_ALPHA) }),
    [color],
  );

  return (
    <div className="flex flex-col h-full my-4 lg:my-0 min-w-0">
      <div className="flex items-center justify-between mb-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <h3 className="font-medium text-md lg:text-sm text-foreground truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          <span className="text-md lg:text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{count}</span>
        </div>
      </div>

      <div
        ref={dropRef}
        aria-label={`${title} column`}
        className={cn(
          "flex-1 min-w-0 rounded-jotty border-2 border-dashed p-3 min-h-[200px] transition-colors duration-200",
          isOver && "border-primary/70 bg-primary/10 shadow-md",
        )}
        style={{
          borderColor: isOver ? undefined : borderColor,
          backgroundColor: isOver ? undefined : bgColor,
          paddingBottom: padBottom ? `calc(0.75rem + ${padBottom}px)` : undefined,
        }}
      >
        <div className="space-y-2">
          {children}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center text-muted-foreground/50 py-8 gap-2">
              <TaskDaily01Icon className="h-8 w-8" />
              <span className="text-md lg:text-sm">{t("checklists.noTasks")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
