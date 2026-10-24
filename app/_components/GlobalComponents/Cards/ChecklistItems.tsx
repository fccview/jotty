"use client";

import { Checklist } from "@/app/_types";
import { ViewMode } from "@/app/_consts/view-modes";
import { ItemViews } from "./ItemViews";
import { ChecklistCard } from "./ChecklistCard";
import { ChecklistListItem } from "./ChecklistListItem";
import { ChecklistGridItem } from "./ChecklistGridItem";

interface ChecklistItemsProps {
  lists: Checklist[];
  view: ViewMode;
  columns: Record<string, number>;
  gap?: "tight" | "loose";
  onSelect: (list: Checklist) => void;
  isPinned: (list: Checklist) => boolean;
  onTogglePin: (list: Checklist) => void;
}

export const ChecklistItems = ({
  lists,
  view,
  columns,
  gap,
  onSelect,
  isPinned,
  onTogglePin,
}: ChecklistItemsProps) => {
  const pinProps = (list: Checklist) => ({
    list,
    onSelect,
    isPinned: isPinned(list),
    onTogglePin: list.lockReason ? undefined : onTogglePin,
  });

  return (
    <ItemViews
      items={lists}
      view={view}
      keyOf={(list) => list.uuid}
      columns={columns}
      gap={gap}
      renderCard={(list) => <ChecklistCard {...pinProps(list)} />}
      renderRow={(list) => <ChecklistListItem {...pinProps(list)} />}
      renderTile={(list) => <ChecklistGridItem {...pinProps(list)} />}
    />
  );
};
