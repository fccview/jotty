"use client";

import { useRouter } from "next/navigation";
import { ChecklistHome } from "@/app/_components/FeatureComponents/Home/Parts/ChecklistHome";
import { NotesHome } from "@/app/_components/FeatureComponents/Home/Parts/NotesHome";
import { TagsHome } from "@/app/_components/FeatureComponents/Home/Parts/TagsHome";
import { Layout } from "@/app/_components/GlobalComponents/Layout/Layout";
import { Checklist, Category, Note, SanitisedUser } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { Modes } from "@/app/_types/enums";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { MobileHeader } from "@/app/_components/GlobalComponents/Layout/MobileHeader";

interface SharingStatus {
  isShared: boolean;
  isPubliclyShared: boolean;
  sharedWith: string[];
}

interface HomeClientProps {
  initialLists: Checklist[];
  initialCategories: Category[];
  initialNotes: Note[];
  initialNotesCategories: Category[];
  user: SanitisedUser | null;
}

export const HomeClient = ({
  initialLists,
  initialCategories,
  initialNotes,
  initialNotesCategories,
  user,
}: HomeClientProps) => {
  const router = useRouter();
  const { mode } = useAppMode();
  const {
    openSettings,
    openCreateNoteModal,
    openCreateChecklistModal,
    openCreateCategoryModal,
  } = useShortcut();

  const handleOpenCreateModal = (initialCategory?: string) => {
    if (mode === Modes.NOTES) {
      openCreateNoteModal(initialCategory || undefined);
    } else {
      openCreateChecklistModal(initialCategory || undefined);
    }
  };

  return (
    <Layout
      categories={
        mode === Modes.TAGS
          ? []
          : mode === Modes.NOTES
            ? initialNotesCategories
            : initialCategories
      }
      onOpenSettings={openSettings}
      onOpenCreateModal={handleOpenCreateModal}
      onOpenCategoryModal={openCreateCategoryModal}
      user={user}
      onCategoryDeleted={() => router.refresh()}
      onCategoryRenamed={() => router.refresh()}
    >
      <MobileHeader
        user={user}
        onOpenSettings={openSettings}
        currentLocale={user?.preferredLocale || "en"}
      />

      {mode === Modes.CHECKLISTS && (
        <ChecklistHome
          lists={initialLists}
          user={user}
          onCreateModal={handleOpenCreateModal}
          onSelectChecklist={(list) => {
            const userSegment = encodeURIComponent(
              list.owner || user?.username || "unknown",
            );
            const uuidSegment = encodeURIComponent(
              list.pending ? list.slug || "" : list.uuid || list.slug || "",
            );
            const categoryQuery = list.pending
              ? `?c=${encodeCategoryPath(list.category || "Uncategorized")}`
              : "";
            router.push(
              `/checklist/${userSegment}/${uuidSegment}${categoryQuery}`,
            );
          }}
        />
      )}

      {mode === Modes.NOTES && (
        <NotesHome
          notes={initialNotes}
          categories={initialNotesCategories}
          user={user}
          onCreateModal={handleOpenCreateModal}
          onSelectNote={(note) => {
            const userSegment = encodeURIComponent(
              note.owner || user?.username || "unknown",
            );
            const uuidSegment = encodeURIComponent(
              note.pending ? note.slug : note.uuid || note.slug,
            );
            const categoryQuery = note.pending
              ? `?c=${encodeCategoryPath(note.category || "Uncategorized")}`
              : "";
            router.push(`/note/${userSegment}/${uuidSegment}${categoryQuery}`);
          }}
        />
      )}

      {mode === Modes.TAGS && (
        <TagsHome
          notes={initialNotes}
          checklists={initialLists}
          user={user}
          onCreateModal={handleOpenCreateModal}
        />
      )}
    </Layout>
  );
};
