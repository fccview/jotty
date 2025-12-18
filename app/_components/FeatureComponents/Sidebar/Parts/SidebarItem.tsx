"use client";

import {
  File02Icon,
  CheckmarkSquare04Icon,
  TaskDaily01Icon,
  PencilEdit02Icon,
  UserMultipleIcon,
  Globe02Icon,
  PinIcon,
  PinOffIcon,
  MoreHorizontalIcon,
  Archive02Icon,
  Delete03Icon,
  LockKeyIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { DropdownMenu } from "@/app/_components/GlobalComponents/Dropdowns/DropdownMenu";
import { AppMode, Checklist, Note } from "@/app/_types";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { togglePin } from "@/app/_server/actions/dashboard";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ARCHIVED_DIR_NAME } from "@/app/_consts/files";
import { toggleArchive } from "@/app/_server/actions/dashboard";
import { deleteList } from "@/app/_server/actions/checklist";
import { deleteNote } from "@/app/_server/actions/note";
import { capitalize } from "lodash";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { sharingInfo } from "@/app/_utils/sharing-utils";

interface SidebarItemProps {
  item: Checklist | Note;
  mode: AppMode;
  isSelected: boolean;
  onItemClick: (item: Checklist | Note) => void;
  onEditItem?: (item: Checklist | Note) => void;
  style?: React.CSSProperties;
  user?: any;
}

export const SidebarItem = ({
  item,
  mode,
  isSelected,
  onItemClick,
  onEditItem,
  style,
  user,
}: SidebarItemProps) => {
  const router = useRouter();
  const { globalSharing, appSettings } = useAppMode();
  const encodedCategory = encodeCategoryPath(item.category || "Uncategorized");
  const itemDetails = sharingInfo(globalSharing, item.id, encodedCategory);

  const isPubliclyShared = itemDetails.isPublic;
  const isShared = itemDetails.exists && itemDetails.sharedWith.length > 0;
  const sharedWith = itemDetails.sharedWith;

  const [isTogglingPin, setIsTogglingPin] = useState<string | null>(null);

  const handleTogglePin = async () => {
    if (!user || isTogglingPin) return;

    setIsTogglingPin(item.id);
    try {
      const result = await togglePin(
        item.uuid || item.id,
        item.category || "Uncategorized",
        mode === Modes.CHECKLISTS ? ItemTypes.CHECKLIST : ItemTypes.NOTE
      );
      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    } finally {
      setIsTogglingPin(null);
    }
  };

  const isItemPinned = () => {
    if (!user) return false;
    const pinnedItems =
      mode === Modes.CHECKLISTS ? user.pinnedLists : user.pinnedNotes;
    if (!pinnedItems) return false;

    const itemPath = `${item.category || "Uncategorized"}/${
      item.uuid || item.id
    }`;
    return pinnedItems.includes(itemPath);
  };

  const dropdownItems = [
    ...(onEditItem
      ? [
          {
            label: "Edit",
            onClick: () => onEditItem(item),
            icon: <PencilEdit02Icon className="h-4 w-4" />,
          },
        ]
      : []),
    ...(onEditItem ? [{ type: "divider" as const }] : []),
    {
      label: isItemPinned() ? "Unpin from Home" : "Pin to Home",
      onClick: handleTogglePin,
      icon: isItemPinned() ? (
        <PinOffIcon className="h-4 w-4" />
      ) : (
        <PinIcon className="h-4 w-4" />
      ),
      disabled: isTogglingPin === item.id,
    },
    ...(item.category !== ARCHIVED_DIR_NAME
      ? [
          {
            label: "Archive",
            onClick: async () => {
              const result = await toggleArchive(item, mode);
              if (result.success) {
                router.refresh();
              }
            },
            icon: <Archive02Icon className="h-4 w-4" />,
          },
        ]
      : []),
    ...(onEditItem ? [{ type: "divider" as const }] : []),
    {
      label: "Delete",
      onClick: async () => {
        const confirmed = window.confirm(
          `Are you sure you want to delete "${item.title}"?`
        );

        if (!confirmed) return;

        const formData = new FormData();

        if (mode === Modes.CHECKLISTS) {
          formData.append("id", item.id);
          formData.append("category", item.category || "Uncategorized");
          const result = await deleteList(formData);
          if (result.success) {
            router.refresh();
          }
        } else {
          formData.append("id", item.id);
          formData.append("category", item.category || "Uncategorized");
          const result = await deleteNote(formData);
          if (result.success) {
            router.refresh();
          }
        }
      },
      variant: "destructive" as const,
      icon: <Delete03Icon className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex items-center group/item" style={style}>
      <button
        onClick={() => onItemClick(item)}
        data-sidebar-item-selected={isSelected}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm rounded-jotty transition-colors flex-1 text-left truncate",
          isSelected
            ? "bg-primary/60 text-primary-foreground"
            : "hover:bg-muted/50 text-foreground"
        )}
      >
        {mode === Modes.NOTES ? (
          <File02Icon
            className={cn(
              "h-4 w-4 text-foreground flex-shrink-0",
              isSelected ? "text-primary-foreground" : "text-foreground"
            )}
          />
        ) : (
          <>
            {"type" in item && item.type === "task" ? (
              <TaskDaily01Icon
                className={cn(
                  "h-4 w-4 text-foreground flex-shrink-0",
                  isSelected ? "text-primary-foreground" : "text-foreground"
                )}
              />
            ) : (
              <CheckmarkSquare04Icon
                className={cn(
                  "h-4 w-4 text-foreground flex-shrink-0",
                  isSelected ? "text-primary-foreground" : "text-foreground"
                )}
              />
            )}
          </>
        )}
        <span className="truncate flex-1">
          {appSettings?.parseContent === "yes"
            ? item.title
            : capitalize(item.title.replace(/-/g, " "))}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          {mode === Modes.NOTES && "encrypted" in item && item.encrypted && (
            <span title="Encrypted note">
              <LockKeyIcon className="h-4 w-4 text-primary" />
            </span>
          )}
          {isShared && (
            <span title={sharedWith.join(", ")}>
              <UserMultipleIcon className="h-4 w-4 text-primary" />
            </span>
          )}
          {isPubliclyShared && (
            <span title="Publicly shared">
              <Globe02Icon className="h-4 w-4 text-primary" />
            </span>
          )}
        </div>
      </button>

      <DropdownMenu
        align="right"
        items={dropdownItems}
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-40 group-hover/item:opacity-100 transition-opacity"
          >
            <MoreHorizontalIcon className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );
};
