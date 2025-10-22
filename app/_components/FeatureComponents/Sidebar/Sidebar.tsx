"use client";

import { Settings, Shield, User, X } from "lucide-react";
import { cn } from "@/app/_utils/global-utils";
import { DeleteCategoryModal } from "@/app/_components/GlobalComponents/Modals/CategoryModals/DeleteCategoryModal";
import { RenameCategoryModal } from "@/app/_components/GlobalComponents/Modals/CategoryModals/RenameCategoryModal";
import { EditChecklistModal } from "@/app/_components/GlobalComponents/Modals/ChecklistModals/EditChecklistModal";
import { EditNoteModal } from "@/app/_components/GlobalComponents/Modals/NotesModal/EditNoteModal";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { AppName } from "@/app/_components/GlobalComponents/Layout/AppName";
import { SettingsModal } from "@/app/_components/GlobalComponents/Modals/SettingsModals/Settings";
import { Checklist, Note } from "@/app/_types";
import { SidebarNavigation } from "./Parts/SidebarNavigation";
import { CategoryList } from "./Parts/CategoryList";
import { SharedItemsList } from "./Parts/SharedItemsList";
import { SidebarActions } from "./Parts/SidebarActions";
import { Modes } from "@/app/_types/enums";
import { SidebarProps, useSidebar } from "@/app/_hooks/useSidebar";
import { Button } from "../../GlobalComponents/Buttons/Button";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { useRouter } from "next/navigation";
import { NavigationGlobalIcon } from "../Navigation/Parts/NavigationGlobalIcon";
import { NavigationLogoutIcon } from "../Navigation/Parts/NavigationLogoutIcon";
import { UserAvatar } from "../../GlobalComponents/User/UserAvatar";
import { NavigationHelpIcon } from "../Navigation/Parts/NavigationHelpIcon";
import { useAppMode } from "@/app/_providers/AppModeProvider";

export const Sidebar = (props: SidebarProps) => {
  const {
    isOpen,
    onClose,
    categories,
    checklists,
    notes,
    onOpenCreateModal,
    onOpenCategoryModal,
    user,
    onOpenSettings,
  } = props;

  const { checkNavigation } = useNavigationGuard();
  const router = useRouter();
  const { isDemoMode, isRwMarkable } = useAppMode();

  const sidebar = useSidebar(props);

  if (!sidebar.isInitialized) return null;

  const currentItems =
    sidebar.mode === Modes.CHECKLISTS ? checklists : notes || [];

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      <aside
        style={
          {
            "--sidebar-desktop-width": `${sidebar.sidebarWidth}px`,
            transition: sidebar.isResizing ? "none" : undefined,
          } as React.CSSProperties
        }
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-background border-r border-border flex flex-col lg:static",
          "transition-transform duration-300 ease-in-out",
          "w-[80vw]",
          "lg:w-[var(--sidebar-desktop-width)] lg:min-w-[var(--sidebar-desktop-width)] lg:max-w-[var(--sidebar-desktop-width)]",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "flex-none"
        )}
      >
        <div
          className="absolute top-0 right-0 w-2 h-full cursor-ew-resize hidden lg:block hover:bg-primary/10"
          onMouseDown={sidebar.startResizing}
        />
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <a href="/" className="flex items-center gap-3">
                <DynamicLogo className="h-8 w-8" size="32x32" />
                <div className="flex items-center gap-2">
                  <AppName
                    className="text-xl font-bold text-foreground"
                    fallback={isRwMarkable ? "rwMarkable" : "jotty·page"}
                  />
                  {isDemoMode && (
                    <span className="text-sm text-muted-foreground font-medium">
                      (demo)
                    </span>
                  )}
                </div>
              </a>
            </div>
          </div>
          <SidebarNavigation
            mode={sidebar.mode}
            onModeChange={sidebar.handleModeSwitch}
          />
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            <div className="px-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  Categories
                </h3>
                <button
                  onClick={sidebar.handleToggleAllCategories}
                  className="text-xs font-medium text-primary hover:underline focus:outline-none"
                >
                  {sidebar.areAnyCollapsed ? "Expand All" : "Collapse All"}
                </button>
              </div>
            </div>
            <SharedItemsList
              items={currentItems}
              collapsed={sidebar.sharedItemsCollapsed}
              onToggleCollapsed={() =>
                sidebar.setSharedItemsCollapsed((p) => !p)
              }
              onItemClick={sidebar.handleItemClick}
              onEditItem={sidebar.handleEditItem}
              isItemSelected={sidebar.isItemSelected}
              mode={sidebar.mode}
              getSharingStatus={sidebar.getSharingStatus}
            />
            <CategoryList
              categories={categories}
              items={currentItems}
              collapsedCategories={sidebar.collapsedCategoriesForMode}
              onToggleCategory={sidebar.toggleCategory}
              onDeleteCategory={(path: string) =>
                sidebar.openModal("deleteCategory", path)
              }
              onRenameCategory={(path: string) =>
                sidebar.openModal("renameCategory", path)
              }
              onQuickCreate={onOpenCreateModal}
              onCreateSubcategory={onOpenCategoryModal}
              onItemClick={sidebar.handleItemClick}
              onEditItem={sidebar.handleEditItem}
              isItemSelected={sidebar.isItemSelected}
              mode={sidebar.mode}
              getSharingStatus={sidebar.getSharingStatus}
            />
          </div>
          <SidebarActions
            mode={sidebar.mode}
            onOpenCreateModal={onOpenCreateModal}
            onOpenCategoryModal={onOpenCategoryModal}
          />

          <div className="hidden lg:flex items-center justify-between px-4 pb-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                checkNavigation(() => router.push("/profile"));
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <UserAvatar
                username={user?.username || ""}
                avatarUrl={user?.avatarUrl}
                size="sm"
                className="mr-1"
              />
              <span className="truncate">{user?.username}</span>
              {user?.isAdmin && (
                <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
                  Admin
                </span>
              )}
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.preventDefault();
                checkNavigation(() => router.push("/profile"));
              }}
            >
              <User className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between p-2 lg:hidden">
            <div className="flex">
              <NavigationGlobalIcon
                icon={
                  <UserAvatar
                    username={user?.username || ""}
                    avatarUrl={user?.avatarUrl}
                    size="sm"
                  />
                }
                onClick={() => checkNavigation(() => router.push("/profile"))}
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  checkNavigation(() => router.push("/profile"));
                }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {user?.username}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <NavigationHelpIcon />

              <NavigationGlobalIcon
                icon={<Settings className="h-6 w-6" />}
                onClick={() => checkNavigation(() => onOpenSettings())}
              />

              {user?.isAdmin && (
                <NavigationGlobalIcon
                  icon={<Shield className="h-5 w-5" />}
                  onClick={() => checkNavigation(() => router.push("/admin"))}
                />
              )}

              <NavigationLogoutIcon />
            </div>
          </div>
        </div>
      </aside>

      {sidebar.modalState.type === "deleteCategory" && (
        <DeleteCategoryModal
          isOpen={true}
          categoryPath={sidebar.modalState.data}
          onClose={sidebar.closeModal}
          onConfirm={sidebar.handleConfirmDeleteCategory}
        />
      )}
      {sidebar.modalState.type === "renameCategory" && (
        <RenameCategoryModal
          isOpen={true}
          categoryPath={sidebar.modalState.data}
          onClose={sidebar.closeModal}
          onRename={sidebar.handleConfirmRenameCategory}
        />
      )}
      {sidebar.modalState.type === "settings" && (
        <SettingsModal isOpen={true} onClose={sidebar.closeModal} />
      )}
      {sidebar.modalState.type === "editItem" &&
        sidebar.mode === Modes.CHECKLISTS && (
          <EditChecklistModal
            checklist={sidebar.modalState.data as Checklist}
            categories={categories}
            onClose={sidebar.closeModal}
            onUpdated={() => {
              sidebar.closeModal();
              sidebar.router.refresh();
            }}
          />
        )}
      {sidebar.modalState.type === "editItem" &&
        sidebar.mode === Modes.NOTES && (
          <EditNoteModal
            note={sidebar.modalState.data as Note}
            categories={categories}
            onClose={sidebar.closeModal}
            onUpdated={() => {
              sidebar.closeModal();
              sidebar.router.refresh();
            }}
          />
        )}
    </>
  );
};
