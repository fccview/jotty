"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Masonry from "react-masonry-css";
import { ItemType } from "@/app/_types";
import { cn } from "@/app/_utils/global-utils";
import { useMediaQuery } from "@/app/_hooks/useMediaQuery";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { usePinnedBoard } from "@/app/_hooks/usePinnedBoard";
import { SectionHeading } from "@/app/_components/GlobalComponents/Layout/SectionHeading";
import { WidgetDismiss } from "./WidgetDismiss";

const CAP = { desktop: 8, mobile: 4 };
const SCROLL_AFTER = 16;
const TILTS = ["-0.6deg", "0.5deg", "-0.3deg", "0.7deg", "0.2deg"];
const MOBILE_QUERY = "(max-width: 639px)";

interface SortableFrameProps {
  id: string;
  isBoard: boolean;
  tilt: string;
  children: ReactNode;
}

const SortableFrame = ({ id, isBoard, tilt, children }: SortableFrameProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative cursor-grab touch-manipulation focus-visible:outline-none",
        isBoard && "pt-2",
        isDragging && "z-10",
      )}
    >
      {isBoard && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 z-10 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
      )}
      <div
        className={cn(
          "rounded-jotty transition-opacity",
          isBoard && "shadow-sm",
          isDragging && "opacity-30",
        )}
        style={isBoard ? { transform: `rotate(${tilt})` } : undefined}
      >
        {children}
      </div>
    </div>
  );
};

interface PinboardProps<T extends { uuid: string }> {
  items: T[];
  type: ItemType;
  gridClassName: string;
  columns: Record<string, number>;
  isBoard: boolean;
  renderItem: (item: T, position: number) => ReactNode;
}

export const Pinboard = <T extends { uuid: string }>({
  items,
  type,
  gridClassName,
  columns,
  isBoard,
  renderItem,
}: PinboardProps<T>) => {
  const t = useTranslations();
  const compact = useCompactNumber();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [showAll, setShowAll] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const board = usePinnedBoard(items, type);

  useEffect(() => setIsMounted(true), []);

  const cap = isMobile ? CAP.mobile : CAP.desktop;
  const total = board.ordered.length;
  const shown = showAll || !isBoard ? board.ordered : board.ordered.slice(0, cap);

  const frames = shown.map((item, index) => (
    <SortableFrame
      key={item.uuid}
      id={item.uuid}
      isBoard={isBoard}
      tilt={TILTS[index % TILTS.length]}
    >
      {renderItem(item, index + 1)}
    </SortableFrame>
  ));

  return (
    <div
      className={cn(
        "jotty-pinboard min-w-0",
        isBoard &&
          "group/widget relative rounded-jotty border border-dashed border-border p-4 sm:p-6 bg-[radial-gradient(rgb(var(--muted-foreground)/0.22)_1px,transparent_1.3px)] [background-size:18px_18px] [background-position:9px_9px]",
      )}
    >
      {!isBoard && <SectionHeading title={t("common.pinned")} />}
      {isBoard && (
        <WidgetDismiss widget="homePinboard" className="absolute right-2 top-2 z-20 bg-card/80" />
      )}
      <DndContext
        sensors={board.sensors}
        collisionDetection={closestCenter}
        onDragStart={board.onDragStart}
        onDragEnd={board.onDragEnd}
        onDragCancel={board.onDragCancel}
      >
        <SortableContext items={shown.map((item) => item.uuid)} strategy={rectSortingStrategy}>
          {isBoard ? (
            <div
              className={cn(
                "grid items-start gap-5",
                gridClassName,
                showAll && total > SCROLL_AFTER && "max-h-[46rem] overflow-y-auto -mx-2 px-2 pt-2",
              )}
            >
              {frames}
            </div>
          ) : (
            <Masonry
              breakpointCols={columns}
              className="flex w-auto -ml-6"
              columnClassName="pl-6 bg-clip-padding min-w-0 [&>*]:mb-6"
            >
              {frames}
            </Masonry>
          )}
        </SortableContext>
        {isMounted &&
          createPortal(
            <DragOverlay>
              {board.activeItem && (
                <div
                  className="shadow-xl rounded-jotty cursor-grabbing"
                  style={{ width: board.activeWidth || undefined }}
                >
                  {renderItem(board.activeItem, board.ordered.indexOf(board.activeItem) + 1)}
                </div>
              )}
            </DragOverlay>,
            document.body,
          )}
      </DndContext>

      {isBoard && total > cap && (
        <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="font-mono">
            {showAll
              ? t("browse.pinnedTotal", { total: compact(total) })
              : t("browse.pinnedOf", { shown: cap, total: compact(total) })}
          </span>
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="font-medium text-primary hover:underline"
          >
            {showAll ? t("browse.showFewer") : t("browse.showAllPinned", { total: compact(total) })}
          </button>
        </div>
      )}
    </div>
  );
};
