"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useShortcuts } from "@/app/_hooks/useShortcuts";
import { CreateNoteModal } from "@/app/_components/GlobalComponents/Modals/NotesModal/CreateNoteModal";
import { CreateListModal } from "@/app/_components/GlobalComponents/Modals/ChecklistModals/CreateListModal";
import { CreateCategoryModal } from "@/app/_components/GlobalComponents/Modals/CategoryModals/CreateCategoryModal";
import { SettingsModal } from "@/app/_components/GlobalComponents/Modals/SettingsModals/Settings";
import { Category, User } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { buildCategoryPath } from "@/app/_utils/global-utils";
import { useRouter } from "next/navigation";
import { useAppMode } from "./AppModeProvider";
import { useNavigationGuard } from "./NavigationGuardProvider";

interface ShortcutContextType {
  openCreateNoteModal: (initialCategory?: string) => void;
  openCreateCategoryModal: (parentCategory?: string) => void;
  openCreateChecklistModal: (initialCategory?: string) => void;
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const ShortcutContext = createContext<ShortcutContextType | undefined>(
  undefined
);

export const ShortcutProvider = ({
  children,
  noteCategories,
  checklistCategories,
  user,
}: {
  children: ReactNode;
  noteCategories: Category[];
  checklistCategories: Category[];
  user: User | null;
}) => {
  const router = useRouter();
  const { mode, setMode } = useAppMode();
  const { checkNavigation } = useNavigationGuard();

  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [showCreateChecklistModal, setShowCreateChecklistModal] =
    useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [initialCategory, setInitialCategory] = useState<string>("");
  const [initialParentCategory, setInitialParentCategory] =
    useState<string>("");

  const openCreateNoteModal = useCallback((category?: string) => {
    setInitialCategory(category || "");
    setShowCreateNoteModal(true);
  }, []);

  const openCreateChecklistModal = useCallback((category?: string) => {
    setInitialCategory(category || "");
    setShowCreateChecklistModal(true);
  }, []);

  const openCreateCategoryModal = useCallback((parentCategory?: string) => {
    setInitialParentCategory(parentCategory || "");
    setShowCreateCategoryModal(true);
  }, []);

  const closeAllModals = useCallback(() => {
    setShowCreateNoteModal(false);
    setShowCreateCategoryModal(false);
    setShowCreateChecklistModal(false);
    setIsSettingsOpen(false);
    setIsSearchOpen(false);
  }, []);

  const shortcuts = [
    {
      code: "ArrowLeft",
      modKey: true,
      altKey: true,
      shiftKey: true,
      handler: () =>
        checkNavigation(() => {
          setMode(Modes.CHECKLISTS);
          router.push("/");
        }),
    },
    {
      code: "ArrowRight",
      modKey: true,
      altKey: true,
      shiftKey: true,
      handler: () =>
        checkNavigation(() => {
          setMode(Modes.NOTES);
          router.push("/");
        }),
    },
    {
      code: "KeyK",
      modKey: true,
      handler: () => setIsSearchOpen(true),
    },
    {
      code: "KeyS",
      modKey: true,
      altKey: true,
      shiftKey: true,
      handler: () => setIsSettingsOpen(true),
    },
    {
      code: "KeyN",
      modKey: true,
      altKey: true,
      shiftKey: true,
      handler: () => {
        if (mode === Modes.NOTES) openCreateNoteModal();
        else openCreateChecklistModal();
      },
    },
    {
      code: "KeyC",
      modKey: true,
      altKey: true,
      shiftKey: true,
      handler: () => openCreateCategoryModal(),
    },
    {
      code: "Escape",
      handler: closeAllModals,
    },
    {
      code: "KeyA",
      modKey: true,
      altKey: true,
      shiftKey: true,
      handler: () => {
        if (user?.isAdmin) router.push("/admin");
      },
    },
    {
      code: "KeyP",
      modKey: true,
      altKey: true,
      shiftKey: true,
      handler: () => router.push("/profile"),
    },
  ];

  useShortcuts(shortcuts);

  return (
    <ShortcutContext.Provider
      value={{
        openCreateNoteModal,
        openCreateCategoryModal,
        openCreateChecklistModal,
        isSearchOpen,
        openSearch: () => setIsSearchOpen(true),
        closeSearch: () => setIsSearchOpen(false),
        toggleSearch: () => setIsSearchOpen((prev) => !prev),
        isSettingsOpen,
        openSettings: () => setIsSettingsOpen(true),
        closeSettings: () => setIsSettingsOpen(false),
      }}
    >
      {children}
      {showCreateNoteModal && (
        <CreateNoteModal
          onClose={() => setShowCreateNoteModal(false)}
          onCreated={(newNote) => {
            if (newNote) {
              const categoryPath = buildCategoryPath(
                newNote.category || "Uncategorized",
                newNote.id
              );
              router.push(`/note/${categoryPath}`);
            }
            setShowCreateNoteModal(false);
            router.refresh();
          }}
          categories={noteCategories}
          initialCategory={initialCategory}
        />
      )}
      {showCreateChecklistModal && (
        <CreateListModal
          onClose={() => setShowCreateChecklistModal(false)}
          onCreated={(newChecklist) => {
            if (newChecklist) {
              const categoryPath = buildCategoryPath(
                newChecklist.category || "Uncategorized",
                newChecklist.id
              );
              router.push(`/checklist/${categoryPath}`);
            }
            setShowCreateChecklistModal(false);
            router.refresh();
          }}
          categories={checklistCategories}
          initialCategory={initialCategory}
        />
      )}
      {showCreateCategoryModal && (
        <CreateCategoryModal
          mode={mode}
          categories={
            mode === Modes.NOTES ? noteCategories : checklistCategories
          }
          initialParent={initialParentCategory}
          onClose={() => {
            setShowCreateCategoryModal(false);
            setInitialParentCategory("");
          }}
          onCreated={() => {
            setShowCreateCategoryModal(false);
            setInitialParentCategory("");
            router.refresh();
          }}
        />
      )}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </ShortcutContext.Provider>
  );
};

export const useShortcut = () => {
  const context = useContext(ShortcutContext);
  if (context === undefined) {
    throw new Error("useShortcut must be used within a ShortcutProvider");
  }
  return context;
};
