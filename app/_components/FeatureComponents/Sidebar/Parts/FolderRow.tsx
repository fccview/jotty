"use client";

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Folder01Icon,
  FolderEditIcon,
  File02Icon,
  CheckmarkSquare04Icon,
  FolderAddIcon,
  Folder02Icon,
  LogoutSquare02Icon,
  Share08Icon,
  Delete03Icon,
} from "hugeicons-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { DropdownMenu } from "@/app/_components/GlobalComponents/Dropdowns/DropdownMenu";
import { AppMode, Category, FolderStats } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { Draggable } from "@/app/_components/FeatureComponents/Sidebar/Parts/Draggable";
import { Droppable } from "@/app/_components/FeatureComponents/Sidebar/Parts/Droppable";
import { PUBLIC_USER } from "@/app/_consts/sharing";
import { ShareBadges } from "@/app/_components/GlobalComponents/Indicators/ShareBadges";
import { SharedFromBadge } from "@/app/_components/GlobalComponents/Indicators/SharedFromBadge";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";
import { leaveFolder } from "@/app/_server/actions/share/operations";
import { canFill } from "@/app/_utils/sharing-utils";

export interface FolderActions {
  onToggleCategory: (categoryPath: string) => void;
  onCategorySelect: (categoryPath: string) => void;
  onDeleteCategory: (categoryPath: string) => void;
  onRenameCategory: (categoryPath: string) => void;
  onQuickCreate: (categoryPath: string) => void;
  onCreateSubcategory: (categoryPath: string) => void;
  onShareCategory: (categoryPath: string) => void;
}

interface FolderRowProps extends FolderActions {
  category: Category;
  stats?: FolderStats;
  hasSubfolders: boolean;
  isCollapsed: boolean;
  mode: AppMode;
  rowIndex: number;
}

export const FolderRow = ({
  category,
  stats,
  hasSubfolders,
  isCollapsed,
  mode,
  rowIndex,
  onToggleCategory,
  onCategorySelect,
  onDeleteCategory,
  onRenameCategory,
  onQuickCreate,
  onCreateSubcategory,
  onShareCategory,
}: FolderRowProps) => {
  const t = useTranslations();
  const router = useRouter();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const folderRef = useRef<HTMLDivElement>(null);

  const hasContent = (stats?.direct || 0) > 0 || hasSubfolders;
  const isOwned = !category.sharedFrom;
  const canRemove = isOwned || category.permissions?.canDelete === true;
  const canFillCategory = canFill(category);

  const handleLeaveFolder = async () => {
    const result = await leaveFolder(
      mode === Modes.CHECKLISTS ? Modes.CHECKLISTS : Modes.NOTES,
      category.sharedFrom!,
      category.uuid!,
    );

    if (result.success) {
      router.refresh();
    } else {
      console.error("Failed to leave folder share:", result.error);
    }

    setShowLeaveModal(false);
  };

  const folderGrants = category.sharedWith || {};
  const isPublicFolder = Boolean(folderGrants[PUBLIC_USER]);
  const outgoing = Object.fromEntries(
    Object.entries(folderGrants).filter(([name]) => name !== PUBLIC_USER),
  );
  const isSharedOut = Object.keys(outgoing).length > 0 || isPublicFolder;

  const ownerActions = [
    { type: "divider" as const },
    {
      label: t("sharing.shareFolder"),
      onClick: () => onShareCategory(category.path),
      icon: <Share08Icon className="h-4 w-4" />,
    },
    {
      label: t("common.renameCategory"),
      onClick: () => onRenameCategory(category.path),
      icon: <FolderEditIcon className="h-4 w-4" />,
    },
    ...(canRemove
      ? [
          {
            label: t("common.deleteCategory"),
            onClick: () => onDeleteCategory(category.path),
            variant: "destructive" as const,
            icon: <Delete03Icon className="h-4 w-4" />,
          },
        ]
      : []),
  ];

  const createActions = canFillCategory
    ? [
        {
          label: t(
            mode === Modes.CHECKLISTS
              ? "checklists.newChecklist"
              : "notes.newNote",
          ),
          onClick: () => onQuickCreate(category.path),
          icon:
            mode === Modes.CHECKLISTS ? (
              <CheckmarkSquare04Icon className="h-4 w-4" />
            ) : (
              <File02Icon className="h-4 w-4" />
            ),
        },
        {
          label: t("common.newCategory"),
          onClick: () => onCreateSubcategory(category.path),
          icon: <FolderAddIcon className="h-4 w-4" />,
        },
      ]
    : [];

  const leaveAction = [
    ...(createActions.length > 0 ? [{ type: "divider" as const }] : []),
    {
      label: t("sharing.leaveShare"),
      onClick: () => setShowLeaveModal(true),
      variant: "destructive" as const,
      icon: <LogoutSquare02Icon className="h-4 w-4" />,
    },
  ];

  const dropdownItems = [
    ...createActions,
    ...(isOwned ? ownerActions : leaveAction),
  ];

  return (
    <>
      <Draggable
        id={`category::${category.path}`}
        data={{
          type: "category",
          categoryPath: category.path,
          rowIndex,
        }}
      >
        <Droppable
          id={`drop-into-category::${category.path}`}
          data={{
            type: "category",
            categoryPath: category.path,
            accepts: canFillCategory ? "all" : "none",
          }}
          className="group"
        >
          {({ isOver }) => (
            <div
              className={cn(
                "flex items-center justify-between",
                isOver && "bg-primary/10 rounded-jotty",
              )}
            >
              <div
                ref={folderRef}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-md lg:text-sm rounded-jotty transition-colors w-full text-left",
                  hasContent ? "hover:bg-muted/50" : "text-muted-foreground",
                )}
                style={{ paddingLeft: `${category.level * 16}px` }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasContent) onToggleCategory(category.path);
                  }}
                  className={cn(
                    "flex items-center shrink-0",
                    hasContent ? "cursor-pointer" : "cursor-default",
                  )}
                >
                  {hasContent ? (
                    isCollapsed ? (
                      <ArrowRight01Icon className="h-5 w-5 lg:h-4 lg:w-4" />
                    ) : (
                      <ArrowDown01Icon className="h-5 w-5 lg:h-4 lg:w-4" />
                    )
                  ) : (
                    <ArrowRight01Icon className="h-5 w-5 lg:h-4 lg:w-4 opacity-20" />
                  )}
                </button>
                <button
                  onClick={() => onCategorySelect(category.path)}
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                >
                  {hasContent ? (
                    isCollapsed ? (
                      <Folder01Icon className="h-5 w-5 lg:h-4 lg:w-4 shrink-0" />
                    ) : (
                      <Folder02Icon className="h-5 w-5 lg:h-4 lg:w-4 shrink-0" />
                    )
                  ) : (
                    <Folder01Icon className="h-5 w-5 lg:h-4 lg:w-4 shrink-0" />
                  )}
                  <span className="truncate font-[500]">{category.name}</span>
                  <SharedFromBadge
                    owner={category.sharedFrom}
                    permissions={category.permissions}
                    showAvatar
                    className="ml-auto"
                    iconClassName="h-4 w-4 lg:h-3 lg:w-3"
                  />
                  <ShareBadges
                    grants={outgoing}
                    isPublic={isPublicFolder}
                    className={cn(!category.sharedFrom && "ml-auto")}
                    iconClassName="h-4 w-4 lg:h-3 lg:w-3"
                  />
                  <span
                    className={cn(
                      "text-md lg:text-xs text-muted-foreground",
                      !isSharedOut && !category.sharedFrom && "ml-auto",
                    )}
                  >
                    {stats?.total || 0}
                  </span>
                </button>
              </div>

              <DropdownMenu
                contextTarget={folderRef}
                align="right"
                items={dropdownItems}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-40 lg:opacity-20 group-hover:opacity-100 transition-opacity"
                    aria-label={t("common.moreOptions")}
                  >
                    <FolderEditIcon className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
          )}
        </Droppable>
      </Draggable>

      <ConfirmModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={handleLeaveFolder}
        title={t("sharing.leaveShare")}
        message={t("sharing.confirmLeaveFolder", {
          categoryName: category.name,
          owner: category.sharedFrom || "",
        })}
        confirmText={t("sharing.leaveShare")}
        variant="destructive"
      />
    </>
  );
};
