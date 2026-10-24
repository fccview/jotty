"use client";

import { FolderShareModal } from "@/app/_components/GlobalComponents/Modals/SharingModals/FolderShareModal";
import { SidebarWrapper } from "@/app/_components/GlobalComponents/Sidebar/SidebarWrapper";
import { DeleteCategoryModal } from "@/app/_components/GlobalComponents/Modals/CategoryModals/DeleteCategoryModal";
import { RenameCategoryModal } from "@/app/_components/GlobalComponents/Modals/CategoryModals/RenameCategoryModal";
import { EditChecklistModal } from "@/app/_components/GlobalComponents/Modals/ChecklistModals/EditChecklistModal";
import { EditNoteModal } from "@/app/_components/GlobalComponents/Modals/NotesModal/EditNoteModal";
import { SettingsModal } from "@/app/_components/GlobalComponents/Modals/SettingsModals/Settings";
import { AppMode, Checklist, Note } from "@/app/_types";
import { SidebarNavigation } from "./Parts/SidebarNavigation";
import { CategoryList } from "./Parts/CategoryList";
import { TagsList } from "./Parts/TagsList";
import { SidebarActions } from "./Parts/SidebarActions";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  MultiplicationSignIcon,
  Search01Icon,
} from "hugeicons-react";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useSidebarSearch } from "@/app/_hooks/useSidebarSearch";
import { useSidebarOffline } from "@/app/_hooks/useSidebarOffline";
import { searchedCategories } from "@/app/_utils/sidebar-tree-utils";
import { Modes } from "@/app/_types/enums";
import { SidebarProps, useSidebar } from "@/app/_hooks/useSidebar";
import { usePathname, useSearchParams } from "next/navigation";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useSidebarStore } from "@/app/_utils/sidebar-store";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

const NOTHING_COLLAPSED = new Set<string>();

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

  const { sidebar: snapshots, tagsEnabled, tagsIndex } = useAppMode();
  const search = useSidebarStore((state) => state.search);
  const setSearch = useSidebarStore((state) => state.setSearch);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const totalTags = Object.keys(tagsIndex).length;
  const searchParams = useSearchParams();
  const { mode, setMode } = useAppMode();
  const pathname = usePathname();
  const isNotesPage = pathname?.includes("/note");
  const isChecklistsPage = pathname?.includes("/checklist");
  const isSomePage = isNotesPage || isChecklistsPage;

  const sidebar = useSidebar(props);
  useSidebarOffline();

  const storedMode = useSidebarStore((state) => state.mode);
  const setStoredMode = useSidebarStore((state) => state.setMode);
  const searchMode = searchParams?.get("mode") as typeof mode;
  const isLastVisited = user?.landingPage === "last-visited";

  const persistedMode =
    isLastVisited && typeof window !== "undefined"
      ? (localStorage.getItem("app-mode") as typeof mode)
      : null;

  const defaultMode = !isLastVisited
    ? user?.landingPage || Modes.CHECKLISTS
    : Modes.CHECKLISTS;

  let sidebarMode =
    searchMode ||
    storedMode ||
    persistedMode ||
    defaultMode ||
    Modes.CHECKLISTS;

  if (isSomePage) {
    sidebarMode = isNotesPage
      ? Modes.NOTES
      : isChecklistsPage
        ? Modes.CHECKLISTS
        : sidebarMode;
  }

  if (sidebarMode === Modes.TAGS && (!tagsEnabled || totalTags === 0)) {
    sidebarMode = (defaultMode as AppMode) || Modes.CHECKLISTS;
  }

  const displayMode = sidebar.pendingMode ?? sidebarMode;
  const snapshot = sidebar.mode === Modes.TAGS ? undefined : snapshots[sidebar.mode];
  const found = useSidebarSearch(sidebar.mode, search || "", snapshot?.stamp);
  const shownCategories = useMemo(
    () => (found ? searchedCategories(categories, found.snapshot.folders, found.folders) : categories),
    [found, categories],
  );

  useEffect(() => {
    if (mode !== sidebarMode) {
      setMode(sidebarMode);
    }
    if (storedMode !== sidebarMode) {
      setStoredMode(sidebarMode);
    }
    if (isLastVisited && sidebarMode) {
      localStorage.setItem("app-mode", sidebarMode);
    }
  }, [sidebarMode]);

  if (!sidebar.isInitialized) return null;

  return (
    <>
      <SidebarWrapper
        isOpen={isOpen}
        onClose={onClose}
        scrollRef={setScrollElement}
        restoreScroll={sidebarMode === Modes.TAGS}
        title={
          sidebarMode !== Modes.TAGS ? (
            <button
              onClick={() =>
                sidebar.setCategoriesSectionCollapsed(
                  !sidebar.categoriesSectionCollapsed,
                )
              }
              className="jotty-sidebar-categories-title flex items-center gap-1 text-sm lg:text-xs font-bold uppercase text-muted-foreground tracking-wider hover:text-foreground transition-colors"
            >
              {sidebar.categoriesSectionCollapsed ? (
                <ArrowRight01Icon className="h-3 w-3" />
              ) : (
                <ArrowDown01Icon className="h-3 w-3" />
              )}
              {t("notes.categories")}
            </button>
          ) : null
        }
        navigation={
          <SidebarNavigation
            mode={displayMode}
            onModeChange={sidebar.handleModeSwitch}
          />
        }
        headerActions={
          sidebarMode !== Modes.TAGS ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSearch(search === null ? "" : null)}
                className="jotty-sidebar-categories-search text-sm lg:text-xs font-medium text-primary hover:underline focus:outline-none"
              >
                {t("common.search")}
              </button>
              <button
                onClick={sidebar.handleToggleAllCategories}
                className="jotty-sidebar-categories-toggle-all text-sm lg:text-xs font-medium text-primary hover:underline focus:outline-none"
              >
                {sidebar.areAnyCollapsed
                  ? t("common.expandAll")
                  : t("common.collapseAll")}
              </button>
            </div>
          ) : null
        }
        footer={
          sidebarMode !== Modes.TAGS ? (
            <SidebarActions
              mode={sidebar.mode}
              onOpenCreateModal={onOpenCreateModal}
              onOpenCategoryModal={onOpenCategoryModal}
            />
          ) : null
        }
      >
        {sidebarMode === Modes.TAGS ? (
          <div className="space-y-4">
            <TagsList
              collapsed={false}
              onToggleCollapsed={() => {}}
              collapsedTags={sidebar.collapsedTags}
              toggleTag={sidebar.toggleTag}
              onTagSelect={sidebar.handleTagSelect}
              onClose={onClose}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {search !== null && (
              <div className="jotty-sidebar-search relative">
                <Search01Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <Input
                  id="sidebarSearch"
                  name="sidebarSearch"
                  type="text"
                  value={search}
                  autoFocus
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSearch(null);
                  }}
                  placeholder={t("common.searchSidebarPlaceholder")}
                  className="pl-10 pr-10 !space-y-0 [&>label]:hidden"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearch(null)}
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                  aria-label={t("common.clear")}
                >
                  <MultiplicationSignIcon className="h-3 w-3" />
                </Button>
              </div>
            )}
            {found && shownCategories.length === 0 && (
              <p className="px-3 text-md lg:text-sm text-muted-foreground">{t("common.noResults")}</p>
            )}
            {!sidebar.categoriesSectionCollapsed && (
              <CategoryList
                categories={shownCategories}
                snapshot={found ? found.snapshot : snapshot}
                scrollElement={scrollElement}
                collapsedCategories={found ? NOTHING_COLLAPSED : sidebar.collapsedCategoriesForMode}
                onToggleCategory={sidebar.toggleCategory}
                onCategorySelect={sidebar.handleCategorySelect}
                onDeleteCategory={(path: string) =>
                  sidebar.openModal("deleteCategory", path)
                }
                onRenameCategory={(path: string) =>
                  sidebar.openModal("renameCategory", path)
                }
                onShareCategory={(path: string) =>
                  sidebar.openModal("shareCategory", path)
                }
                onQuickCreate={onOpenCreateModal}
                onCreateSubcategory={onOpenCategoryModal}
                onClose={onClose}
                onEditItem={(item) => sidebar.openModal("editItem", item)}
                isItemSelected={sidebar.isItemSelected}
                mode={sidebar.mode}
                modeSettled={sidebar.mode === sidebarMode}
                user={user || undefined}
              />
            )}
          </div>
        )}
      </SidebarWrapper>

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
      {sidebar.modalState.type === "shareCategory" && (
        <FolderShareModal
          isOpen={true}
          mode={sidebar.mode as Modes}
          categoryPath={sidebar.modalState.data}
          onClose={sidebar.closeModal}
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
            onUpdated={(customFunction: () => void = () => {}) => {
              sidebar.closeModal();
              sidebar.router.refresh();
              customFunction?.();
            }}
          />
        )}
    </>
  );
};
