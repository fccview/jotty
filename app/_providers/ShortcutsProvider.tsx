"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useTransition,
} from "react";
import { useShortcuts } from "@/app/_hooks/useShortcuts";
import { CreateNoteModal } from "@/app/_components/GlobalComponents/Modals/NotesModal/CreateNoteModal";
import { CreateListModal } from "@/app/_components/GlobalComponents/Modals/ChecklistModals/CreateListModal";
import { CreateCategoryModal } from "@/app/_components/GlobalComponents/Modals/CategoryModals/CreateCategoryModal";
import { SettingsModal } from "@/app/_components/GlobalComponents/Modals/SettingsModals/Settings";
import { Category, SanitisedUser, User } from "@/app/_types";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { itemHref } from "@/app/_utils/global-utils";
import { useRouter } from "next/navigation";
import { useAppMode } from "./AppModeProvider";
import { useNavigationGuard } from "./NavigationGuardProvider";
import { createNote } from "@/app/_server/actions/note";
import { generateDateTimeTitle } from "../_utils/date-utils";
import { useTranslations } from "next-intl";
import { useToast } from "./ToastProvider";

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
  user: SanitisedUser | null;
}) => {
  const router = useRouter();
  const { mode, setMode } = useAppMode();
  const { checkNavigation } = useNavigationGuard();
  const { showToast } = useToast();
  const t = useTranslations();
  const quickLock = useRef(false);
  const [isOpeningNote, startOpeningNote] = useTransition();

  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [showCreateChecklistModal, setShowCreateChecklistModal] =
    useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [initialCategory, setInitialCategory] = useState<string>("");
  const [initialParentCategory, setInitialParentCategory] =
    useState<string>("");

  const quickCreate = useCallback(
    async (category?: string) => {
      if (quickLock.current || isOpeningNote) return;
      quickLock.current = true;

      try {
        const formData = new FormData();
        formData.append("title", generateDateTimeTitle());
        formData.append(
          "category",
          category || user?.quickCreateNotesCategory || ""
        );
        formData.append("rawContent", "");

        const result = await createNote(formData);

        if (!result.success || !result.data?.uuid) {
          console.warn("Quick create refused:", result.error);
          showToast({
            type: "error",
            title: t("common.error"),
            message: result.error || t("notes.createNoteFailed"),
          });
          return;
        }

        const href = itemHref(ItemTypes.NOTE, result.data.uuid);
        startOpeningNote(() => {
          router.push(`${href}?editor=true`);
          router.refresh();
        });
      } catch (error) {
        console.error("Quick create failed:", error);
        showToast({
          type: "error",
          title: t("common.error"),
          message: t("notes.createNoteFailed"),
        });
      } finally {
        quickLock.current = false;
      }
    },
    [user?.quickCreateNotesCategory, isOpeningNote, router, showToast, t]
  );

  const openCreateNoteModal = useCallback(
    (category?: string) => {
      if (user?.quickCreateNotes === "enable") {
        checkNavigation(() => quickCreate(category));
        return;
      }

      setInitialCategory(category || "");
      setShowCreateNoteModal(true);
    },
    [user?.quickCreateNotes, checkNavigation, quickCreate]
  );

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

  const shortcuts = useMemo(
    () => [
      {
        code: "ArrowLeft",
        modKey: true,
        altKey: true,
        shiftKey: true,
        handler: () =>
          checkNavigation(() => {
            setMode(Modes.CHECKLISTS);
            router.push(`/?mode=${Modes.CHECKLISTS}`);
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
            router.push(`/?mode=${Modes.NOTES}`);
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
    ],
    [
      checkNavigation,
      setMode,
      mode,
      openCreateNoteModal,
      openCreateChecklistModal,
      openCreateCategoryModal,
      closeAllModals,
      user?.isAdmin,
      router,
    ]
  );

  useShortcuts(shortcuts);

  const contextValue = useMemo(
    () => ({
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
    }),
    [
      openCreateNoteModal,
      openCreateCategoryModal,
      openCreateChecklistModal,
      isSearchOpen,
      isSettingsOpen,
    ]
  );

  return (
    <ShortcutContext.Provider value={contextValue}>
      {children}
      {showCreateNoteModal && (
        <CreateNoteModal
          onClose={() => setShowCreateNoteModal(false)}
          onCreated={(newNote) => {
            if (newNote?.uuid) {
              const href = itemHref(ItemTypes.NOTE, newNote.uuid);
              router.push(newNote.encrypted ? href : `${href}?editor=true`);
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
            if (newChecklist?.uuid) {
              router.push(itemHref(ItemTypes.CHECKLIST, newChecklist.uuid));
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
