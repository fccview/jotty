import { getUserNotes } from "@/app/_server/actions/note/queries";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getCategories } from "@/app/_server/actions/category";
import { NotesPageClient } from "@/app/_components/FeatureComponents/Notes/NotesPageClient";
import { BrowseLayout } from "@/app/_components/FeatureComponents/Browse/BrowseLayout";
import { Note } from "@/app/_types";
import { Modes } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const [notesResult, user, categoriesResult] = await Promise.all([
    getUserNotes(),
    getCurrentUser(),
    getCategories(Modes.NOTES),
  ]);

  const notes = notesResult.success && notesResult.data ? notesResult.data : [];
  const categories = categoriesResult.data || [];

  return (
    <BrowseLayout mode={Modes.NOTES} categories={categories} user={user}>
      <NotesPageClient
        initialNotes={notes as Note[]}
        categories={categories}
        user={user}
      />
    </BrowseLayout>
  );
}
