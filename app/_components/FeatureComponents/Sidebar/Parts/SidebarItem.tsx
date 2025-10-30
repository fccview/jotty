"use client";

import {
  FileText,
  CheckSquare,
  BarChart3,
  Edit,
  Users,
  Globe,
  Pin,
  PinOff,
  MoreHorizontal,
  Archive,
  Trash,
} from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { DropdownMenu } from "@/app/_components/GlobalComponents/Dropdowns/DropdownMenu";
import { AppMode, Checklist, Note } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { togglePin } from "@/app/_server/actions/users";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ARCHIVED_DIR_NAME } from "@/app/_consts/files";
import { toggleArchive } from "@/app/_server/actions/users";
import { deleteList } from "@/app/_server/actions/checklist";
import { deleteNote } from "@/app/_server/actions/note";

interface SharingStatus {
  isShared: boolean;
  isPubliclyShared: boolean;
  sharedWith: string[];
}

interface SidebarItemProps {
  item: Checklist | Note;
  mode: AppMode;
  isSelected: boolean;
  onItemClick: (item: Checklist | Note) => void;
  onEditItem?: (item: Checklist | Note) => void;
  sharingStatus?: SharingStatus | null;
  style?: React.CSSProperties;
  user?: any;
}

export const SidebarItem = ({
  item,
  mode,
  isSelected,
  onItemClick,
  onEditItem,
  sharingStatus,
  style,
  user,
}: SidebarItemProps) => {
  const router = useRouter();
  const [isTogglingPin, setIsTogglingPin] = useState<string | null>(null);

  const handleTogglePin = async () => {
    if (!user || isTogglingPin) return;

    setIsTogglingPin(item.id);
    try {
      const result = await togglePin(
        item.id,
        item.category || "Uncategorized",
        mode === Modes.CHECKLISTS ? "list" : "note"
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

    const itemPath = `${item.category || "Uncategorized"}/${item.id}`;
    return pinnedItems.includes(itemPath);
  };

  const dropdownItems = [
    ...(onEditItem
      ? [
          {
            label: "Edit",
            onClick: () => onEditItem(item),
            icon: <Edit className="h-4 w-4" />,
          },
        ]
      : []),
    ...(onEditItem ? [{ type: "divider" as const }] : []),
    {
      label: isItemPinned() ? "Unpin from Home" : "Pin to Home",
      onClick: handleTogglePin,
      icon: isItemPinned() ? (
        <PinOff className="h-4 w-4" />
      ) : (
        <Pin className="h-4 w-4" />
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
            icon: <Archive className="h-4 w-4" />,
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
            router.push("/");
          }
        }
      },
      variant: "destructive" as const,
      icon: <Trash className="h-4 w-4" />,
    },
  ];
  return (
    <div className="flex items-center group/item" style={style}>
      <button
        onClick={() => onItemClick(item)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors flex-1 text-left truncate",
          isSelected
            ? "bg-primary/60 text-primary-foreground"
            : "hover:bg-muted/50 text-foreground"
        )}
      >
        {mode === Modes.NOTES ? (
          <FileText
            className={cn(
              "h-4 w-4 text-foreground flex-shrink-0",
              isSelected ? "text-primary-foreground" : "text-foreground"
            )}
          />
        ) : (
          <>
            {"type" in item && item.type === "task" ? (
              <BarChart3
                className={cn(
                  "h-4 w-4 text-foreground flex-shrink-0",
                  isSelected ? "text-primary-foreground" : "text-foreground"
                )}
              />
            ) : (
              <CheckSquare
                className={cn(
                  "h-4 w-4 text-foreground flex-shrink-0",
                  isSelected ? "text-primary-foreground" : "text-foreground"
                )}
              />
            )}
          </>
        )}
        <span className="truncate flex-1">{item.title}</span>

        <div className="flex items-center gap-1 flex-shrink-0">
          {sharingStatus?.isPubliclyShared && (
            <Globe
              className={cn(
                "h-3 w-3 text-primary",
                isSelected ? "text-primary-foreground" : "text-foreground"
              )}
            />
          )}
          {sharingStatus?.isShared && !sharingStatus.isPubliclyShared && (
            <Users
              className={cn(
                "h-3 w-3 text-primary",
                isSelected ? "text-primary-foreground" : "text-foreground"
              )}
            />
          )}
        </div>
      </button>

      {!isSelected && (
        <DropdownMenu
          align="right"
          items={dropdownItems}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-40 lg:opacity-0 hover:bg-muted/50 text-foreground group-hover/item:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          }
        />
      )}
    </div>
  );
};
