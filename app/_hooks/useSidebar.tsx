import { useRouter, usePathname } from "next/navigation";
import { useAppMode } from "../_providers/AppModeProvider";
import { useNavigationGuard } from "../_providers/NavigationGuardProvider";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Checklist, Category, Note, AppMode, SanitisedUser } from "../_types";
import { ItemTypes, Modes } from "../_types/enums";
import { buildCategoryPath } from "../_utils/global-utils";
import { deleteCategory, renameCategory } from "../_server/actions/category";
import { useSidebarStore } from "../_utils/sidebar-store";

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateModal: (initialCategory?: string) => void;
  onOpenCategoryModal: (parentCategory?: string) => void;
  categories: Category[];
  user: SanitisedUser | null;
  onCategoryDeleted?: (categoryName: string) => void;
  onCategoryRenamed?: (oldName: string, newName: string) => void;
  onOpenSettings: () => void;
}

export const useSidebar = (props: SidebarProps) => {
  const { categories, onCategoryDeleted, onCategoryRenamed, onClose } = props;

  const router = useRouter();
  const pathname = usePathname();
  const { mode, setMode, isInitialized, checklists, notes, selectedFilter, setSelectedFilter } = useAppMode();
  const { checkNavigation } = useNavigationGuard();

  const {
    collapsedCategories,
    toggleCategory: storeToggleCategory,
    expandCategoryPath: storeExpandCategoryPath,
    setAllCategoriesCollapsed,
    sharedItemsCollapsed,
    setSharedItemsCollapsed,
    tagsCollapsed,
    setTagsCollapsed,
    categoriesSectionCollapsed,
    setCategoriesSectionCollapsed,
    collapsedTags,
    toggleTag: storeToggleTag,
  } = useSidebarStore();

  const [modalState, setModalState] = useState<{
    type: string | null;
    data: any;
  }>({ type: null, data: null });

  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const collapsedCategoriesForMode = useMemo(() => {
    return new Set(collapsedCategories[mode] || []);
  }, [collapsedCategories, mode]);

  const collapsedTagsSet = useMemo(() => {
    return new Set(collapsedTags);
  }, [collapsedTags]);

  const openModal = (type: string, data: any = null) =>
    setModalState({ type, data });
  const closeModal = () => setModalState({ type: null, data: null });

  const handleConfirmDeleteCategory = async () => {
    if (modalState.type !== "deleteCategory" || !modalState.data) return;
    const formData = new FormData();
    formData.append("path", modalState.data);
    formData.append("mode", mode);
    const result = await deleteCategory(formData);
    if (result.success) {
      onCategoryDeleted?.(modalState.data);
      closeModal();
    }
  };

  const handleConfirmRenameCategory = async (
    oldPath: string,
    newName: string
  ) => {
    const formData = new FormData();
    formData.append("oldPath", oldPath);
    formData.append("newName", newName);
    formData.append("mode", mode);
    const result = await renameCategory(formData);
    if (result.success) {
      onCategoryRenamed?.(oldPath, newName);
      closeModal();
    }
  };

  const { allCollapsiblePaths, areAnyCollapsed } = useMemo(() => {
    const items = mode === Modes.CHECKLISTS ? checklists : notes;

    const pathsOfParentsToCategories = new Set(
      categories.map((c) => c.parent).filter(Boolean) as string[]
    );
    const pathsOfParentsToItems = new Set(
      items.map((item) => item.category).filter(Boolean) as string[]
    );

    const allPaths = new Set(
      Array.from(pathsOfParentsToCategories).concat(
        Array.from(pathsOfParentsToItems)
      )
    );

    const anyCollapsed = Array.from(allPaths).some((path) =>
      collapsedCategoriesForMode.has(path)
    );

    return { allCollapsiblePaths: allPaths, areAnyCollapsed: anyCollapsed };
  }, [categories, checklists, notes, mode, collapsedCategoriesForMode]);

  const handleToggleAllCategories = () => {
    setAllCategoriesCollapsed(mode, Array.from(allCollapsiblePaths), !areAnyCollapsed);
  };

  const toggleCategory = useCallback(
    (categoryPath: string) => {
      storeToggleCategory(mode, categoryPath);
    },
    [mode, storeToggleCategory]
  );

  const toggleTag = useCallback(
    (tagPath: string) => {
      storeToggleTag(tagPath);
    },
    [storeToggleTag]
  );

  const handleModeSwitch = (newMode: AppMode) =>
    checkNavigation(() => {
      setMode(newMode);
      router.push("/?mode=" + newMode);
    });

  const isHomePage = pathname === "/" || pathname === "";

  const handleCategorySelect = (categoryPath: string) => {
    if (!isHomePage) {
      toggleCategory(categoryPath);
      return;
    }
    if (selectedFilter?.type === 'category' && selectedFilter.value === categoryPath) {
      setSelectedFilter(null);
    } else {
      setSelectedFilter({ type: 'category', value: categoryPath });
    }
    onClose();
  };

  const handleTagSelect = (tagName: string) => {
    if (!isHomePage) {
      toggleTag(tagName);
      return;
    }
    if (selectedFilter?.type === 'tag' && selectedFilter.value === tagName) {
      setSelectedFilter(null);
    } else {
      setSelectedFilter({ type: 'tag', value: tagName });
    }
    onClose();
  };

  const isItemSelected = (item: Checklist | Note) => {
    const expectedPath = buildCategoryPath(
      item.category || "Uncategorized",
      item.id
    )?.toLowerCase();

    return (
      pathname?.toLowerCase() ===
      `/${
        mode === Modes.NOTES ? ItemTypes.NOTE : ItemTypes.CHECKLIST
      }/${expectedPath}`.toLowerCase()
    );
  };

  const expandCategoryPath = useCallback(
    (categoryPath: string) => {
      storeExpandCategoryPath(mode, categoryPath);
    },
    [mode, storeExpandCategoryPath]
  );

  useEffect(() => {
    if (!isInitialized) return;

    const itemId = pathname.split("/").pop();
    let currentItem: Partial<Checklist> | Partial<Note> | undefined;

    if (mode === Modes.CHECKLISTS) {
      currentItem = checklists.find((c) => c.id === itemId);
    } else {
      currentItem = notes.find((n) => n.id === itemId);
    }

    if (currentItem && currentItem.category) {
      expandCategoryPath(currentItem.category);
    }
  }, [pathname, mode, checklists, notes, isInitialized, expandCategoryPath]);

  return {
    mode,
    isInitialized,
    handleModeSwitch,
    modalState,
    openModal,
    closeModal,
    collapsedCategoriesForMode,
    toggleCategory,
    sharedItemsCollapsed,
    setSharedItemsCollapsed,
    tagsCollapsed,
    setTagsCollapsed,
    categoriesSectionCollapsed,
    setCategoriesSectionCollapsed,
    collapsedTags: collapsedTagsSet,
    toggleTag,
    selectedTag,
    setSelectedTag,
    selectedFilter,
    setSelectedFilter,
    handleCategorySelect,
    handleTagSelect,
    handleToggleAllCategories,
    areAnyCollapsed,
    isItemSelected,
    router,
    onClose,
    checkNavigation,
    handleConfirmDeleteCategory,
    handleConfirmRenameCategory,
  };
};
