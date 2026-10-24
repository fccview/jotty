"use client";

import Link from "next/link";
import {
  PencilEdit02Icon,
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
import { AppMode, Checklist, Note, SanitisedUser } from "@/app/_types";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ARCHIVED_DIR_NAME } from "@/app/_consts/files";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { toggleArchive } from "@/app/_server/actions/dashboard";
import { deleteList } from "@/app/_server/actions/checklist";
import { deleteNote } from "@/app/_server/actions/note";
import { leaveItem } from "@/app/_server/actions/share/operations";
import { DETACH_LOSSY } from "@/app/_consts/sharing";
import { useToast } from "@/app/_providers/ToastProvider";
import { capitalize } from "lodash";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { usePinToggle } from "@/app/_hooks/usePinToggle";
import { ItemShareMark } from "@/app/_components/GlobalComponents/Cards/Parts/ItemShareMark";
import { ItemIcon } from "@/app/_components/GlobalComponents/Cards/Parts/ItemGlyph";
import { PinStateIcon } from "@/app/_components/GlobalComponents/Cards/Parts/PinToggle";
import { useTranslations } from "next-intl";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";
import { ShareModal } from "@/app/_components/GlobalComponents/Modals/SharingModals/ShareModal";
import { MetadataProvider } from "@/app/_providers/MetadataProvider";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { useReturnPath } from "@/app/_hooks/useReturnPath";

interface SidebarItemProps {
  item: Checklist | Note;
  mode: AppMode;
  isSelected: boolean;
  onClose?: () => void;
  onEditItem?: (item: Checklist | Note) => void;
  style?: React.CSSProperties;
  user?: SanitisedUser;
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
  const { showToast } = useToast();
  const { checkNavigation, checkWouldBlock } = useNavigationGuard();
  const returnPath = useReturnPath(`/?mode=${mode}`);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const itemRef = useRef<HTMLAnchorElement>(null);
  const { appSettings } = useAppMode();
  const shareMode = mode === Modes.NOTES ? Modes.NOTES : Modes.CHECKLISTS;
  const isOwned = user?.username === item.owner;
  const isShareable = isOwned;
  const isLocked = Boolean(item.lockReason);
  const canEdit = !isLocked && (isOwned || item.permissions?.canEdit === true);
  const canDelete = isOwned || item.permissions?.canDelete === true;

  const itemType =
    mode === Modes.NOTES ? ItemTypes.NOTE : ItemTypes.CHECKLIST;
  const { toggle: togglePin, toggling } = usePinToggle(itemType);
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
      showToast({
        type: "error",
        title: t("common.error"),
        message: t(
          result.error === DETACH_LOSSY ? "sharing.cantLeave" : "sharing.leaveFailed",
        ),
      });
    }

    setShowLeaveModal(false);
  };

  const handleTogglePin = () => {
    if (user) togglePin(item.uuid);
  };

  const pinnedEntries =
    mode === Modes.CHECKLISTS ? user?.pinnedLists : user?.pinnedNotes;
  const isPinned = Boolean(
    pinnedEntries?.some((entry) => isPinnedEntry(entry, item.uuid)),
  );

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
    ...(isShareable && !isLocked
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
    ...(!isOwned && item.isLoose
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
      label: isPinned ? t("common.unpinFromHome") : t("common.pinToHome"),
      onClick: handleTogglePin,
      icon: <PinStateIcon isPinned={isPinned} className="h-4 w-4" />,
      disabled: toggling === item.uuid || isLocked,
    },
    ...(item.category !== ARCHIVED_DIR_NAME && canEdit
      ? [
          {
            label: t("common.archive"),
            onClick: async () => {
              const result = await toggleArchive(item, mode);
              if (!result.success) return;
              if (isSelected) {
                checkNavigation(() => router.push(returnPath));
              }
              router.refresh();
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
        ref={itemRef}
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
        <ItemIcon
          type={itemType}
          listType={"type" in item ? item.type : undefined}
          className={cn(
            "h-5 w-5 lg:h-4 lg:w-4 text-foreground flex-shrink-0",
            isSelected ? "text-primary-foreground" : "text-foreground",
          )}
        />
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
          <ItemShareMark item={item} mode={shareMode} iconClassName="h-4 w-4" />
        </div>
      </Link>

      <DropdownMenu
        contextTarget={itemRef}
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
