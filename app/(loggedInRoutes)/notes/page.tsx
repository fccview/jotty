import { getUserNotes } from "@/app/_server/actions/note";
import { getCategories } from "@/app/_server/actions/category";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";
import { NotesPageClient } from "@/app/_components/FeatureComponents/Notes/NotesPageClient";
import { Note } from "@/app/_types";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const [notesResult, categoriesResult] = await Promise.all([
    getUserNotes(),
    getCategories(Modes.NOTES),
  ]);

  const notes = notesResult.success && notesResult.data ? notesResult.data : [];
  const categories =
    categoriesResult.success && categoriesResult.data
      ? categoriesResult.data
      : [];
  const user = await getCurrentUser();

  return (
    <NotesPageClient
      initialNotes={notes as Note[]}
      initialCategories={categories}
      user={user}
    />
  );
}
