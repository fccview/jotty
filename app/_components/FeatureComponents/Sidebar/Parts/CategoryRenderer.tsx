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
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { DropdownMenu } from "@/app/_components/GlobalComponents/Dropdowns/DropdownMenu";
import { AppMode, Category, Checklist, Note, SanitisedUser } from "@/app/_types";
import { Draggable } from "@/app/_components/FeatureComponents/Sidebar/Parts/Draggable";
import { SidebarItem } from "@/app/_components/FeatureComponents/Sidebar/Parts/SidebarItem";
import { Modes } from "@/app/_types/enums";
import { DropIndicator } from "@/app/_components/FeatureComponents/Sidebar/Parts/DropIndicator";
import { Droppable } from "@/app/_components/FeatureComponents/Sidebar/Parts/Droppable";
import { useTranslations } from "next-intl";
import { PUBLIC_USER } from "@/app/_consts/sharing";
import { ShareBadges } from "@/app/_components/GlobalComponents/Indicators/ShareBadges";
import { SharedFromBadge } from "@/app/_components/GlobalComponents/Indicators/SharedFromBadge";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";
import { leaveFolder } from "@/app/_server/actions/share/operations";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface CategoryRendererProps {
  category: Category;
  allCategories: Category[];
  allItems: (Checklist | Note)[];
  collapsedCategories: Set<string>;
  onToggleCategory: (categoryName: string) => void;
  onCategorySelect: (categoryPath: string) => void;
  onDeleteCategory: (categoryName: string) => void;
  onRenameCategory: (categoryName: string) => void;
  onQuickCreate: (categoryName: string) => void;
  onCreateSubcategory: (categoryPath: string) => void;
  onShareCategory: (categoryPath: string) => void;
  onClose?: () => void;
  onEditItem?: (item: Checklist | Note) => void;
  isItemSelected: (item: Checklist | Note) => boolean;
  mode: AppMode;
  user?: SanitisedUser;
}

export const CategoryRenderer = (props: CategoryRendererProps) => {
  const t = useTranslations();
  const {
    category,
    allCategories,
    allItems,
    collapsedCategories,
    onToggleCategory,
    onCategorySelect,
    onDeleteCategory,
    onRenameCategory,
    onQuickCreate,
    onCreateSubcategory,
    onShareCategory,
    onClose,
    onEditItem,
    isItemSelected,
    mode,
    user,
  } = props;

  const router = useRouter();
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const getItemsInCategory = (categoryPath: string) =>
    allItems.filter(
      (item) => (item.category || "Uncategorized") === categoryPath
    );
  const getSubCategories = (parentPath: string) =>
    allCategories.filter((cat) => cat.parent === parentPath);

  const getTotalItemsInCategory = (categoryPath: string): number => {
    const directItems = getItemsInCategory(categoryPath).length;
    const subCategories = getSubCategories(categoryPath);
    return (
      directItems +
      subCategories.reduce(
        (total, subCat) => total + getTotalItemsInCategory(subCat.path),
        0
      )
    );
  };

  const categoryItems = getItemsInCategory(category.path);
  const subCategories = getSubCategories(category.path);
  const isCollapsed = collapsedCategories.has(category.path);
  const hasContent = categoryItems.length > 0 || subCategories.length > 0;

  const isOwned = !category.sharedFrom;
  const canWrite = isOwned || category.permissions?.canEdit === true;
  const canRemove = isOwned || category.permissions?.canDelete === true;

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
    },
    {
      label: t("common.renameCategory"),
      onClick: () => onRenameCategory(category.path),
    },
    ...(canRemove
      ? [
          {
            label: t("common.deleteCategory"),
            onClick: () => onDeleteCategory(category.path),
            variant: "destructive" as const,
          },
        ]
      : []),
  ];

  const createActions = canWrite
    ? [
        {
          label: t(
            mode === Modes.CHECKLISTS ? "checklists.newChecklist" : "notes.newNote",
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

  const firstChildType = subCategories[0] ? "category" : "item";
  const firstChildId = subCategories[0]
    ? `category::${subCategories[0].path}`
    : categoryItems[0]
      ? `item::${categoryItems[0].uuid}`
      : undefined;

  return (
    <div className="space-y-1">
      <Draggable
        id={`category::${category.path}`}
        data={{
          type: "category",
          categoryPath: category.path,
        }}
      >
        <Droppable
          id={`drop-into-category::${category.path}`}
          data={{
            type: "category",
            categoryPath: category.path,
            accepts: canWrite ? "all" : "none",
          }}
          className="group"
        >
          {({ isOver }) => (
            <div
              className={cn(
                "flex items-center justify-between",
                isOver && "bg-primary/10 rounded-jotty"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-md lg:text-sm rounded-jotty transition-colors w-full text-left",
                  hasContent
                    ? "hover:bg-muted/50"
                    : "text-muted-foreground"
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
                    hasContent ? "cursor-pointer" : "cursor-default"
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
                    {getTotalItemsInCategory(category.path)}
                  </span>
                </button>
              </div>

              <DropdownMenu
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

      {!isCollapsed && (
        <div className="ml-2 border-l border-border/30 pl-2">
          <DropIndicator
            id={`drop-start::${category.path}`}
            data={{
              type: "drop-indicator",
              parentPath: category.path,
              position: "before",
              targetDndId: firstChildId,
              targetType: firstChildType,
            }}
          />

          {subCategories.map((subCat) => (
            <div key={subCat.path}>
              <CategoryRenderer {...props} category={subCat} />
              <DropIndicator
                id={`drop-after-category::${subCat.path}`}
                data={{
                  type: "drop-indicator",
                  parentPath: category.path,
                  position: "after",
                  targetDndId: `category::${subCat.path}`,
                  targetType: "category",
                }}
              />
            </div>
          ))}

          {categoryItems.map((item) => (
            <div key={item.uuid}>
              <Draggable
                id={`item::${item.uuid}`}
                data={{
                  type: "item",
                  uuid: item.uuid,
                }}
              >
                <SidebarItem
                  item={item}
                  mode={mode}
                  isSelected={isItemSelected(item)}
                  onClose={onClose}
                  onEditItem={onEditItem}
                  style={{ paddingLeft: `${category.level * 16}px` }}
                  user={user}
                />
              </Draggable>
              <DropIndicator
                id={`drop-after-item::${item.uuid}`}
                data={{
                  type: "drop-indicator",
                  parentPath: category.path,
                  position: "after",
                  targetDndId: `item::${item.uuid}`,
                  targetType: "item",
                }}
              />
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
};
