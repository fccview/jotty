"use client";

import { CheckmarkSquare04Icon, File02Icon, TaskDaily01Icon } from "hugeicons-react";
import { isKanbanType, ItemTypes } from "@/app/_types/enums";
import { cn } from "@/app/_utils/global-utils";
import { WizardIcon } from "@/app/_components/GlobalComponents/Layout/CustomIcons/WizardIcon";

interface ItemIconProps {
  type: ItemTypes;
  listType?: string;
  className?: string;
}

export const ItemIcon = ({ type, listType, className }: ItemIconProps) => {
  if (type === ItemTypes.NOTE) return <File02Icon className={className} />;
  if (isKanbanType(listType)) return <TaskDaily01Icon className={className} />;
  return <CheckmarkSquare04Icon className={className} />;
};

interface ItemGlyphProps {
  type: ItemTypes;
  listType?: string;
  isEncrypted?: boolean;
  className?: string;
}

export const ItemGlyph = ({ type, listType, isEncrypted = false, className }: ItemGlyphProps) => (
  <span
    className={cn(
      "inline-flex h-8 w-8 items-center justify-center rounded-jotty shrink-0",
      isEncrypted ? "bg-primary/[0.15] text-primary" : "bg-muted text-primary",
      className,
    )}
  >
    {isEncrypted ? (
      <WizardIcon className="h-5 w-5" />
    ) : (
      <ItemIcon type={type} listType={listType} className="h-4 w-4" />
    )}
  </span>
);
