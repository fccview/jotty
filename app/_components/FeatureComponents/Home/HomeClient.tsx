"use client";

import { useRouter } from "next/navigation";
import { ChecklistHome } from "@/app/_components/FeatureComponents/Home/Parts/ChecklistHome";
import { NotesHome } from "@/app/_components/FeatureComponents/Home/Parts/NotesHome";
import { TagsHome } from "@/app/_components/FeatureComponents/Home/Parts/TagsHome";
import { Layout } from "@/app/_components/GlobalComponents/Layout/Layout";
import { Checklist, Category, Note, SanitisedUser } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { itemHref } from "@/app/_utils/global-utils";
import { MobileHeader } from "@/app/_components/GlobalComponents/Layout/MobileHeader";

interface SharingStatus {
  isShared: boolean;
  isPubliclyShared: boolean;
  sharedWith: string[];
}

interface HomeClientProps {
  initialLists: Checklist[];
  initialCategories: Category[];
  initialDocs: Note[];
  initialDocsCategories: Category[];
  user: SanitisedUser | null;
}

export const HomeClient = ({
  initialLists,
  initialCategories,
  initialDocs,
  initialDocsCategories,
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
        mode === Modes.TAGS ? [] : mode === Modes.NOTES ? initialDocsCategories : initialCategories
      }
      onOpenSettings={openSettings}
      onOpenCreateModal={handleOpenCreateModal}
      onOpenCategoryModal={openCreateCategoryModal}
      user={user}
      onCategoryDeleted={() => router.refresh()}
      onCategoryRenamed={() => router.refresh()}
    >
      <MobileHeader user={user} onOpenSettings={openSettings} currentLocale={user?.preferredLocale || "en"} />

      {mode === Modes.CHECKLISTS && (
        <ChecklistHome
          lists={initialLists}
          user={user}
          onCreateModal={handleOpenCreateModal}
          onSelectChecklist={(list) => {
            if (!list.uuid) return;
            router.push(itemHref(ItemTypes.CHECKLIST, list.uuid));
          }}
        />
      )}

      {mode === Modes.NOTES && (
        <NotesHome
          notes={initialDocs}
          categories={initialDocsCategories}
          user={user}
          onCreateModal={handleOpenCreateModal}
          onSelectNote={(note) => {
            if (!note.uuid) return;
            router.push(itemHref(ItemTypes.NOTE, note.uuid));
          }}
        />
      )}

      {mode === Modes.TAGS && (
        <TagsHome
          notes={initialDocs}
          checklists={initialLists}
          user={user}
          onCreateModal={handleOpenCreateModal}
        />
      )}
    </Layout>
  );
};
