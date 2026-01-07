"use client";

import { cn } from "@/app/_utils/global-utils";
import { DeleteCategoryModal } from "@/app/_components/GlobalComponents/Modals/CategoryModals/DeleteCategoryModal";
import { RenameCategoryModal } from "@/app/_components/GlobalComponents/Modals/CategoryModals/RenameCategoryModal";
import { EditChecklistModal } from "@/app/_components/GlobalComponents/Modals/ChecklistModals/EditChecklistModal";
import { EditNoteModal } from "@/app/_components/GlobalComponents/Modals/NotesModal/EditNoteModal";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { AppName } from "@/app/_components/GlobalComponents/Layout/AppName";
import { SettingsModal } from "@/app/_components/GlobalComponents/Modals/SettingsModals/Settings";
import { AppMode, Checklist, Note } from "@/app/_types";
import { SidebarNavigation } from "./Parts/SidebarNavigation";
import { CategoryList } from "./Parts/CategoryList";
import { SharedItemsList } from "./Parts/SharedItemsList";
import { SidebarActions } from "./Parts/SidebarActions";
import { Modes } from "@/app/_types/enums";
import { SidebarProps, useSidebar } from "@/app/_hooks/useSidebar";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

export const Sidebar = (props: SidebarProps) => {
  const t = useTranslations();
  const {
    isOpen,
    onClose,
    categories,
    onOpenCreateModal,
    onOpenCategoryModal,
    user,
  } = props;

  const { checkNavigation } = useNavigationGuard();
  const { checklists, notes } = useAppMode();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isDemoMode, isRwMarkable, mode, setMode } = useAppMode();
  const pathname = usePathname();
  const isNotesPage = pathname?.includes("/note");
  const isChecklistsPage = pathname?.includes("/checklist");
  const isSomePage = isNotesPage || isChecklistsPage;

  const sidebar = useSidebar(props);
  const categoriesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const searchMode = searchParams?.get("mode") as AppMode;
    const localStorageMode =
      mode || (localStorage.getItem("app-mode") as AppMode);

    let updatedMode =
      user?.landingPage !== "last-visited"
        ? user?.landingPage
        : localStorageMode || Modes.CHECKLISTS;

    if (isSomePage) {
      updatedMode = isNotesPage
        ? Modes.NOTES
        : isChecklistsPage
          ? Modes.CHECKLISTS
          : sidebar.mode || Modes.CHECKLISTS;
    }

    setMode(searchMode || updatedMode || Modes.CHECKLISTS);
  }, []);

  const currentItems = mode === Modes.CHECKLISTS ? checklists : notes || [];

  useEffect(() => {
    if (!categoriesScrollRef.current || !pathname) return;

    const scrollToSelectedItem = () => {
      const selectedButton = categoriesScrollRef.current?.querySelector(
        '[data-sidebar-item-selected="true"]'
      ) as HTMLElement;

      if (selectedButton && categoriesScrollRef.current) {
        const container = categoriesScrollRef.current;
        const buttonRect = selectedButton.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const isVisible =
          buttonRect.top >= containerRect.top &&
          buttonRect.bottom <= containerRect.bottom;

        if (!isVisible) {
          const scrollTop =
            container.scrollTop +
            buttonRect.top -
            containerRect.top -
            containerRect.height / 2 +
            buttonRect.height / 2;

          container.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: "smooth",
          });
        }
      }
    };

    const timeoutId = setTimeout(scrollToSelectedItem, 100);

    return () => clearTimeout(timeoutId);
  }, [pathname, sidebar.mode, currentItems]);

  if (!sidebar.isInitialized) return null;

  return (
    <>
      <div
        className={cn(
          "jotty-sidebar-overlay fixed inset-0 z-40 bg-black/50 lg:hidden",
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
          "jotty-sidebar rounded-tr-[0.25em] rounded-br-[0.25em] fixed left-0 top-0 z-50 h-full bg-background border-r border-border flex flex-col lg:static",
          "transition-transform duration-300 ease-in-out",
          "w-[88vw]",
          "lg:w-[var(--sidebar-desktop-width)] lg:min-w-[var(--sidebar-desktop-width)] lg:max-w-[var(--sidebar-desktop-width)]",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "flex-none"
        )}
      >
        <div
          className="jotty-sidebar-resize-handle absolute top-0 right-0 w-2 h-full cursor-ew-resize hidden lg:block hover:bg-primary/10"
          onMouseDown={sidebar.startResizing}
        />

        <div className="jotty-sidebar-content flex flex-col h-full">
          <div className="jotty-sidebar-header p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <a href="/" className="flex items-center gap-3">
                <DynamicLogo className="h-8 w-8" size="32x32" />
                <div className="flex items-center gap-2">
                  <AppName
                    className="text-xl font-bold text-foreground jotty-app-name"
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
            mode={mode}
            onModeChange={sidebar.handleModeSwitch}
          />
          <div
            ref={categoriesScrollRef}
            className="jotty-sidebar-categories flex-1 overflow-y-auto hide-scrollbar p-2 space-y-4"
          >
            <div className="px-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="jotty-sidebar-categories-title text-xs font-bold uppercase text-muted-foreground tracking-wider">{t('notes.categories')}</h3>
                <button
                  onClick={sidebar.handleToggleAllCategories}
                  className="jotty-sidebar-categories-toggle-all text-xs font-medium text-primary hover:underline focus:outline-none"
                >
                  {sidebar.areAnyCollapsed ? t("common.expandAll") : t("common.collapseAll")}
                </button>
              </div>
            </div>
            <SharedItemsList
              collapsed={sidebar.sharedItemsCollapsed}
              onToggleCollapsed={() =>
                sidebar.setSharedItemsCollapsed((p) => !p)
              }
              onItemClick={sidebar.handleItemClick}
              isItemSelected={sidebar.isItemSelected}
              mode={sidebar.mode}
            />
            <CategoryList
              categories={categories}
              items={currentItems as unknown as (Checklist | Note)[]}
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
              user={user || undefined}
            />
          </div>
          <SidebarActions
            mode={sidebar.mode}
            onOpenCreateModal={onOpenCreateModal}
            onOpenCategoryModal={onOpenCategoryModal}
          />

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
            onUpdated={(customFunction: () => void = () => { }) => {
              sidebar.closeModal();
              sidebar.router.refresh();
              customFunction?.();
            }}
          />
        )}
    </>
  );
};
