"use client";

import { useRouter } from "next/navigation";
import { ChecklistHome } from "@/app/_components/FeatureComponents/Home/Parts/ChecklistHome";
import { NotesHome } from "@/app/_components/FeatureComponents/Home/Parts/NotesHome";
import { TagsHome } from "@/app/_components/FeatureComponents/Home/Parts/TagsHome";
import { PageShell } from "@/app/_components/GlobalComponents/Layout/PageShell";
import { Checklist, Category, Note, SanitisedUser } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { CreatePrefill, useShortcut } from "@/app/_providers/ShortcutsProvider";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { itemHref } from "@/app/_utils/global-utils";

interface HomeClientProps {
  initialLists: Checklist[];
  initialCategories: Category[];
  initialDocs: Note[];
  initialDocsCategories: Category[];
  openItems: number;
  user: SanitisedUser | null;
}

export const HomeClient = ({
  initialLists,
  initialCategories,
  initialDocs,
  initialDocsCategories,
  openItems,
  user,
}: HomeClientProps) => {
  const router = useRouter();
  const { mode } = useAppMode();
  const { openCreateNoteModal, openCreateChecklistModal } = useShortcut();

  const handleOpenCreateModal = (
    initialCategory?: string,
    prefill?: CreatePrefill,
  ) => {
    if (mode === Modes.NOTES) {
      openCreateNoteModal(initialCategory || undefined, prefill);
    } else {
      openCreateChecklistModal(initialCategory || undefined, prefill);
    }
  };

  return (
    <PageShell
      categories={
        mode === Modes.TAGS ? [] : mode === Modes.NOTES ? initialDocsCategories : initialCategories
      }
      user={user}
      onOpenCreateModal={handleOpenCreateModal}
      onCategoryDeleted={() => router.refresh()}
      onCategoryRenamed={() => router.refresh()}
    >

      {mode === Modes.CHECKLISTS && (
        <ChecklistHome
          lists={initialLists}
          user={user}
          openItems={openItems}
          onCreate={handleOpenCreateModal}
          onSelectChecklist={(list) => {
            if (!list.uuid) return;
            router.push(itemHref(ItemTypes.CHECKLIST, list.uuid));
          }}
        />
      )}

      {mode === Modes.NOTES && (
        <NotesHome
          notes={initialDocs}
          user={user}
          onCreate={handleOpenCreateModal}
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
    </PageShell>
  );
};
