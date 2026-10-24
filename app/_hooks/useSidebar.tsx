import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAppMode } from "../_providers/AppModeProvider";
import { useNavigationGuard } from "../_providers/NavigationGuardProvider";
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Checklist, Category, Note, AppMode, SanitisedUser } from "../_types";
import { ItemTypes, Modes } from "../_types/enums";
import { itemHref } from "../_utils/global-utils";
import { deleteCategory, renameCategory } from "../_server/actions/category";
import { useSidebarStore } from "../_utils/sidebar-store";
import { useShallow } from "zustand/react/shallow";
import { tagHref } from "../_utils/tag-utils";
import { collapsiblePaths } from "../_utils/sidebar-tree-utils";
import { fetchSidebarSpot } from "../_utils/ui-lookups";
import { useSidebarRows } from "./useSidebarRows";

const NO_FOLDERS = {};
const ITEM_ROUTES: Partial<Record<AppMode, string>> = {
  [Modes.NOTES]: "/note/",
  [Modes.CHECKLISTS]: "/checklist/",
};

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
  const searchParams = useSearchParams();
  const { mode, setMode, isInitialized, sidebar: snapshots, selectedFilter, setSelectedFilter } = useAppMode();
  const snapshot = mode === Modes.TAGS ? undefined : snapshots[mode];
  const { ensure } = useSidebarRows(mode, snapshot);
  const ensureRef = useRef(ensure);
  ensureRef.current = ensure;
  const stamp = snapshot?.stamp;
  const lastSpot = useRef<string | null>(null);
  const { checkNavigation } = useNavigationGuard();

  const {
    collapsedCategories,
    toggleCategory: storeToggleCategory,
    expandCategoryPath: storeExpandCategoryPath,
    setAllCategoriesCollapsed,
    tagsCollapsed,
    setTagsCollapsed,
    categoriesSectionCollapsed,
    setCategoriesSectionCollapsed,
    collapsedTags,
    toggleTag: storeToggleTag,
  } = useSidebarStore(
    useShallow((state) => ({
      collapsedCategories: state.collapsedCategories,
      toggleCategory: state.toggleCategory,
      expandCategoryPath: state.expandCategoryPath,
      setAllCategoriesCollapsed: state.setAllCategoriesCollapsed,
      tagsCollapsed: state.tagsCollapsed,
      setTagsCollapsed: state.setTagsCollapsed,
      categoriesSectionCollapsed: state.categoriesSectionCollapsed,
      setCategoriesSectionCollapsed: state.setCategoriesSectionCollapsed,
      collapsedTags: state.collapsedTags,
      toggleTag: state.toggleTag,
    })),
  );

  const [modalState, setModalState] = useState<{
    type: string | null;
    data: any;
  }>({ type: null, data: null });

  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);
  const pendingFromUrl = useRef<string | null>(null);

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
    const allPaths = collapsiblePaths(categories, snapshot?.folders || NO_FOLDERS);
    const anyCollapsed = allPaths.some((path) => collapsedCategoriesForMode.has(path));
    return { allCollapsiblePaths: allPaths, areAnyCollapsed: anyCollapsed };
  }, [categories, snapshot, collapsedCategoriesForMode]);

  const handleToggleAllCategories = () => {
    setAllCategoriesCollapsed(mode, allCollapsiblePaths, !areAnyCollapsed);
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

  const urlKey = pathname + "?" + searchParams.toString();

  const handleModeSwitch = (newMode: AppMode) =>
    checkNavigation(() => {
      setMode(newMode);
      setPendingMode(newMode);
      pendingFromUrl.current = urlKey;
      router.push("/?mode=" + newMode);
    });

  useEffect(() => {
    if (pendingMode == null) return;
    const urlMode = searchParams.get("mode") as AppMode | null;
    if (urlMode === pendingMode || urlKey !== pendingFromUrl.current) {
      setPendingMode(null);
      pendingFromUrl.current = null;
    }
  }, [urlKey, searchParams, pendingMode]);

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
    if (selectedFilter?.type === 'tag' && selectedFilter.value === tagName) {
      setSelectedFilter(null);
      if (!isHomePage) {
        checkNavigation(() => router.push("/?mode=tags"));
      }
    } else {
      setSelectedFilter({ type: 'tag', value: tagName });

      if (!isHomePage) {
        checkNavigation(() => router.push(tagHref(tagName)));
      }
    }
    onClose();
  };

  const isItemSelected = (item: Checklist | Note) => {
    if (!item.uuid) return false;

    return (
      pathname?.toLowerCase() ===
      itemHref(
        mode === Modes.NOTES ? ItemTypes.NOTE : ItemTypes.CHECKLIST,
        item.uuid,
      ).toLowerCase()
    );
  };

  const expandCategoryPath = useCallback(
    (categoryPath: string) => {
      storeExpandCategoryPath(mode, categoryPath);
    },
    [mode, storeExpandCategoryPath]
  );

  const openUuid = pathname.startsWith(ITEM_ROUTES[mode] || "\0") ? pathname.split("/").pop() : undefined;

  useEffect(() => {
    if (!isInitialized || !openUuid) return;
    let cancelled = false;

    fetchSidebarSpot(mode, openUuid)
      .then((result) => {
        if (cancelled || !result.success || !result.data) return;
        const spot = `${mode}:${openUuid}:${result.data.category}`;
        if (lastSpot.current !== spot) expandCategoryPath(result.data.category);
        lastSpot.current = spot;
        ensureRef.current([result.data]);
      })
      .catch((error) => console.error("Sidebar could not find the open item:", error));

    return () => {
      cancelled = true;
    };
  }, [openUuid, mode, isInitialized, expandCategoryPath, stamp]);

  return {
    mode,
    isInitialized,
    handleModeSwitch,
    pendingMode,
    modalState,
    openModal,
    closeModal,
    collapsedCategoriesForMode,
    toggleCategory,
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
