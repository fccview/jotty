"use client";

import Link from "next/link";
import {
  File02Icon,
  CheckmarkSquare04Icon,
  TaskDaily01Icon,
  PencilEdit02Icon,
  PinIcon,
  PinOffIcon,
  MoreHorizontalIcon,
  Archive02Icon,
  Delete03Icon,
  LockKeyIcon,
  LogoutSquare02Icon,
  Share08Icon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn, itemHref as itemUrl, isPinnedEntry } from "@/app/_utils/global-utils";
import { DropdownMenu } from "@/app/_components/GlobalComponents/Dropdowns/DropdownMenu";
import { AppMode, Checklist, Note } from "@/app/_types";
import { isKanbanType, ItemTypes, Modes } from "@/app/_types/enums";
import { togglePin } from "@/app/_server/actions/dashboard";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ARCHIVED_DIR_NAME } from "@/app/_consts/files";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { toggleArchive } from "@/app/_server/actions/dashboard";
import { deleteList } from "@/app/_server/actions/checklist";
import { deleteNote } from "@/app/_server/actions/note";
import { leaveItem } from "@/app/_server/actions/share/operations";
import { capitalize } from "lodash";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { shareGrants, sharingInfo } from "@/app/_utils/sharing-utils";
import { ShareBadges } from "@/app/_components/GlobalComponents/Indicators/ShareBadges";
import { SharedFromBadge } from "@/app/_components/GlobalComponents/Indicators/SharedFromBadge";
import { useTranslations } from "next-intl";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";
import { ShareModal } from "@/app/_components/GlobalComponents/Modals/SharingModals/ShareModal";
import { MetadataProvider } from "@/app/_providers/MetadataProvider";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";

interface SidebarItemProps {
  item: Checklist | Note;
  mode: AppMode;
  isSelected: boolean;
  onClose?: () => void;
  onEditItem?: (item: Checklist | Note) => void;
  style?: React.CSSProperties;
  user?: any;
}

export const SidebarItem = ({
  item,
  mode,
  isSelected,
  onClose,
  onEditItem,
  style,
  user,
}: SidebarItemProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { checkNavigation, checkWouldBlock } = useNavigationGuard();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const { globalSharing, appSettings } = useAppMode();
  const itemDetails = sharingInfo(globalSharing, item.uuid || "");

  const isPubliclyShared = itemDetails.isPublic;
  const isOwned = user?.username === item.owner;
  const isShareable = isOwned;
  const canEdit = isOwned || item.permissions?.canEdit === true;
  const canDelete = isOwned || item.permissions?.canDelete === true;

  const grants = shareGrants(
    globalSharing,
    item.uuid || "",
    mode === Modes.NOTES ? Modes.NOTES : Modes.CHECKLISTS,
  );

  const [isTogglingPin, setIsTogglingPin] = useState<string | null>(null);

  const itemType =
    mode === Modes.NOTES ? ItemTypes.NOTE : ItemTypes.CHECKLIST;
  const itemHref = itemUrl(itemType, item.uuid!);

  const handleDeleteItem = async () => {
    const formData = new FormData();
    formData.append("uuid", item.uuid!);

    if (mode === Modes.CHECKLISTS) {
      const result = await deleteList(formData);
      if (result.success) {
        router.refresh();
      }
    } else {
      const result = await deleteNote(formData);
      if (result.success) {
        router.refresh();
      }
    }
    setShowDeleteModal(false);
  };

  const handleLeaveShare = async () => {
    const result = await leaveItem(
      mode === Modes.CHECKLISTS ? Modes.CHECKLISTS : Modes.NOTES,
      item.uuid!,
    );

    if (result.success) {
      router.refresh();
    } else {
      console.error("Failed to leave share:", result.error);
    }

    setShowLeaveModal(false);
  };

  const handleTogglePin = async () => {
    if (!user || isTogglingPin || !item.uuid) return;

    setIsTogglingPin(item.uuid);
    try {
      const result = await togglePin(item.uuid, itemType);
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

    return (pinnedItems as string[]).some(
      (entry) => isPinnedEntry(entry, item.uuid),
    );
  };

  const editActions = [
    ...(onEditItem && canEdit
      ? [
          {
            label: t("common.edit"),
            onClick: () => onEditItem(item),
            icon: <PencilEdit02Icon className="h-4 w-4" />,
          },
        ]
      : []),
    ...(isShareable
      ? [
          {
            label: t("sharing.share"),
            onClick: () => setShowShareModal(true),
            icon: <Share08Icon className="h-4 w-4" />,
          },
        ]
      : []),
  ];

  const removalActions = [
    ...(canDelete
      ? [
          {
            label: t("common.delete"),
            onClick: () => setShowDeleteModal(true),
            variant: "destructive" as const,
            icon: <Delete03Icon className="h-4 w-4" />,
          },
        ]
      : []),
    ...(!isOwned
      ? [
          {
            label: t("sharing.leaveShare"),
            onClick: () => setShowLeaveModal(true),
            variant: "destructive" as const,
            icon: <LogoutSquare02Icon className="h-4 w-4" />,
          },
        ]
      : []),
  ];

  const dropdownItems = [
    ...editActions,
    ...(editActions.length > 0 ? [{ type: "divider" as const }] : []),
    {
      label: isItemPinned() ? t("common.unpinFromHome") : t("common.pinToHome"),
      onClick: handleTogglePin,
      icon: isItemPinned() ? (
        <PinOffIcon className="h-4 w-4" />
      ) : (
        <PinIcon className="h-4 w-4" />
      ),
      disabled: isTogglingPin === item.uuid,
    },
    ...(item.category !== ARCHIVED_DIR_NAME && canEdit
      ? [
          {
            label: t("common.archive"),
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
    ...(removalActions.length > 0 ? [{ type: "divider" as const }] : []),
    ...removalActions,
  ];

  const handleClick = (e: React.MouseEvent) => {
    if (checkWouldBlock()) {
      e.preventDefault();
      checkNavigation(() => {
        router.push(itemHref);
        onClose?.();
      });
    } else {
      onClose?.();
    }
  };

  return (
    <div className="flex items-center group/item" style={style}>
      <Link
        href={itemHref}
        prefetch={false}
        onClick={handleClick}
        data-sidebar-item-selected={isSelected}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-md lg:text-sm rounded-jotty transition-colors flex-1 text-left truncate",
          isSelected
            ? "bg-primary/60 text-primary-foreground"
            : "hover:bg-muted/50 text-foreground",
        )}
      >
        {mode === Modes.NOTES ? (
          <File02Icon
            className={cn(
              "h-5 w-5 lg:h-4 lg:w-4 text-foreground flex-shrink-0",
              isSelected ? "text-primary-foreground" : "text-foreground",
            )}
          />
        ) : (
          <>
            {"type" in item && isKanbanType(item.type) ? (
              <TaskDaily01Icon
                className={cn(
                  "h-5 w-5 lg:h-4 lg:w-4 text-foreground flex-shrink-0",
                  isSelected ? "text-primary-foreground" : "text-foreground",
                )}
              />
            ) : (
              <CheckmarkSquare04Icon
                className={cn(
                  "h-5 w-5 lg:h-4 lg:w-4 text-foreground flex-shrink-0",
                  isSelected ? "text-primary-foreground" : "text-foreground",
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
            <span title={t("editor.encryptedNote")}>
              <LockKeyIcon className="h-4 w-4 text-primary" />
            </span>
          )}
          {item.sharedFrom ? (
            <SharedFromBadge
              owner={item.sharedFrom}
              permissions={item.permissions}
            />
          ) : (
            <ShareBadges grants={grants} isPublic={isPubliclyShared} />
          )}
        </div>
      </Link>

      <DropdownMenu
        align="right"
        items={dropdownItems}
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-40 group-hover/item:opacity-100 transition-opacity"
            aria-label={t("common.moreOptions")}
          >
            <MoreHorizontalIcon className="h-4 w-4" />
          </Button>
        }
      />

      <ConfirmModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={handleLeaveShare}
        title={t("sharing.leaveShare")}
        message={t("sharing.confirmLeaveItem", { itemTitle: item.title })}
        confirmText={t("sharing.leaveShare")}
        variant="destructive"
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteItem}
        title={t("common.delete")}
        message={t("common.confirmDeleteItem", { itemTitle: item.title })}
        confirmText={t("common.delete")}
        variant="destructive"
      />

      {showShareModal && (
        <MetadataProvider
          metadata={{
            id: item.id,
            uuid: item.uuid,
            title: item.title,
            category: item.category || UNCATEGORIZED,
            owner: item.owner || "",
            type: mode === Modes.NOTES ? "note" : "checklist",
          }}
        >
          <ShareModal
            isOpen={showShareModal}
            onClose={() => {
              setShowShareModal(false);
              router.refresh();
            }}
          />
        </MetadataProvider>
      )}
    </div>
  );
};
