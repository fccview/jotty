import { useRouter, usePathname } from "next/navigation";
import { useAppMode } from "../_providers/AppModeProvider";
import { useNavigationGuard } from "../_providers/NavigationGuardProvider";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Checklist, Category, Note, AppMode, User } from "../_types";
import { Modes } from "../_types/enums";
import { deleteCategory, renameCategory } from "../_server/actions/category";
import { buildCategoryPath } from "../_utils/global-utils";

interface SharingStatus {
  isShared: boolean;
  isPubliclyShared: boolean;
  sharedWith: string[];
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateModal: (initialCategory?: string) => void;
  onOpenCategoryModal: (parentCategory?: string) => void;
  categories: Category[];
  checklists: Checklist[];
  notes?: Note[];
  sharingStatuses?: Record<string, SharingStatus>;
  user: User | null;
  onCategoryDeleted?: (categoryName: string) => void;
  onCategoryRenamed?: (oldName: string, newName: string) => void;
  onOpenSettings: () => void;
}

export const useSidebar = (props: SidebarProps) => {
  const {
    categories,
    checklists,
    notes = [],
    sharingStatuses = {},
    onCategoryDeleted,
    onCategoryRenamed,
    onClose,
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const { mode, setMode, isInitialized } = useAppMode();
  const { checkNavigation } = useNavigationGuard();

  const [modalState, setModalState] = useState<{
    type: string | null;
    data: any;
  }>({ type: null, data: null });
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<AppMode, Set<string>>
  >({ [Modes.CHECKLISTS]: new Set(), [Modes.NOTES]: new Set() });
  const [sharedItemsCollapsed, setSharedItemsCollapsed] = useState(false);
  const [isLocalStorageInitialized, setIsLocalStorageInitialized] =
    useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);
  const sidebarWidthRef = useRef(sidebarWidth);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    const savedWidth = localStorage.getItem("sidebar-width");
    if (savedWidth) {
      const width = parseInt(savedWidth);
      if (width >= 320 && width <= 800) setSidebarWidth(width);
    }
    try {
      setCollapsedCategories({
        [Modes.CHECKLISTS]: new Set(
          JSON.parse(
            localStorage.getItem(
              `sidebar-collapsed-categories-${Modes.CHECKLISTS}`
            ) || "[]"
          )
        ),
        [Modes.NOTES]: new Set(
          JSON.parse(
            localStorage.getItem(
              `sidebar-collapsed-categories-${Modes.NOTES}`
            ) || "[]"
          )
        ),
      });
      setSharedItemsCollapsed(
        JSON.parse(
          localStorage.getItem("sidebar-shared-items-collapsed") || "false"
        )
      );
    } catch (error) {
      console.error("Failed to parse sidebar state from localStorage:", error);
    }
    setIsLocalStorageInitialized(true);
  }, []);

  useEffect(() => {
    if (isLocalStorageInitialized && !isResizing.current) {
      localStorage.setItem("sidebar-width", sidebarWidth.toString());
    }
  }, [sidebarWidth, isLocalStorageInitialized]);

  useEffect(() => {
    if (isLocalStorageInitialized)
      localStorage.setItem(
        `sidebar-collapsed-categories-${mode}`,
        JSON.stringify(Array.from(collapsedCategories[mode]))
      );
  }, [collapsedCategories, mode, isLocalStorageInitialized]);
  useEffect(() => {
    if (isLocalStorageInitialized)
      localStorage.setItem(
        "sidebar-shared-items-collapsed",
        JSON.stringify(sharedItemsCollapsed)
      );
  }, [sharedItemsCollapsed, isLocalStorageInitialized]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidthRef.current;
    const doDrag = (e: MouseEvent) => {
      const newWidth = Math.max(
        320,
        Math.min(800, startWidth + e.clientX - startX)
      );
      setSidebarWidth(newWidth);
    };
    const stopDrag = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);
      localStorage.setItem("sidebar-width", sidebarWidthRef.current.toString());
    };
    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  }, []);

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
    const currentModeCollapsedCategories =
      collapsedCategories[mode] || new Set();

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
      currentModeCollapsedCategories.has(path)
    );

    return { allCollapsiblePaths: allPaths, areAnyCollapsed: anyCollapsed };
  }, [categories, checklists, notes, mode, collapsedCategories]);

  const handleToggleAllCategories = () => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [mode]: areAnyCollapsed ? new Set() : allCollapsiblePaths,
    }));
  };

  const handleModeSwitch = (newMode: AppMode) =>
    checkNavigation(() => {
      setMode(newMode);
      router.push("/");
    });
  const handleItemClick = (item: Checklist | Note) =>
    checkNavigation(() => {
      const categoryPath = buildCategoryPath(
        item.category || "Uncategorized",
        item.id
      );
      router.push(
        `/${mode === Modes.NOTES ? "note" : "checklist"}/${categoryPath}`
      );
      onClose();
    });
  const handleEditItem = (item: Checklist | Note) =>
    openModal("editItem", item);
  const toggleCategory = (categoryPath: string) => {
    setCollapsedCategories((prev) => {
      const newModeSet = new Set(prev[mode]);
      newModeSet.has(categoryPath)
        ? newModeSet.delete(categoryPath)
        : newModeSet.add(categoryPath);
      return { ...prev, [mode]: newModeSet };
    });
  };

  const isItemSelected = (item: Checklist | Note) => {
    const expectedPath = buildCategoryPath(
      item.category || "Uncategorized",
      item.id
    );
    return (
      pathname ===
      `/${mode === Modes.NOTES ? "note" : "checklist"}/${expectedPath}`
    );
  };
  const getSharingStatus = (itemId: string) => sharingStatuses[itemId] || null;

  const expandCategoryPath = useCallback(
    (categoryPath: string) => {
      if (!categoryPath) return;

      setCollapsedCategories((prev) => {
        const newCollapsed = { ...prev };
        const currentModeCollapsed = new Set(newCollapsed[mode]);

        const pathParts = categoryPath.split("/");
        let currentPath = "";
        for (const part of pathParts) {
          if (currentPath === "") {
            currentPath = part;
          } else {
            currentPath = `${currentPath}/${part}`;
          }
          if (currentModeCollapsed.has(currentPath)) {
            currentModeCollapsed.delete(currentPath);
          }
        }
        newCollapsed[mode] = currentModeCollapsed;
        return newCollapsed;
      });
    },
    [mode]
  );

  useEffect(() => {
    if (!isInitialized) return;

    const itemId = pathname.split("/").pop();
    let currentItem: Checklist | Note | undefined;

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
    isResizing: isResizing.current,
    startResizing,
    sidebarWidth,
    mode,
    isInitialized,
    handleModeSwitch,
    modalState,
    openModal,
    closeModal,
    collapsedCategoriesForMode: collapsedCategories[mode],
    toggleCategory,
    sharedItemsCollapsed,
    setSharedItemsCollapsed,
    handleToggleAllCategories,
    areAnyCollapsed,
    handleItemClick,
    handleEditItem,
    handleConfirmDeleteCategory,
    handleConfirmRenameCategory,
    isItemSelected,
    getSharingStatus,
    router,
  };
};
