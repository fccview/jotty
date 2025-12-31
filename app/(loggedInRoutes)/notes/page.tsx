import { getUserNotes } from "@/app/_server/actions/note";
import { getCurrentUser } from "@/app/_server/actions/users";
import { NotesPageClient } from "@/app/_components/FeatureComponents/Notes/NotesPageClient";
import { Note } from "@/app/_types";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const [notesResult, user] = await Promise.all([
    getUserNotes(),
    getCurrentUser(),
  ]);

  const notes = notesResult.success && notesResult.data ? notesResult.data : [];

  return (
    <NotesPageClient
      initialNotes={notes as Note[]}
      user={user}
    />
  );
}
