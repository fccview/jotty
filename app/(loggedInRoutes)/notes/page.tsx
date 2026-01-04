import { getUserNotes } from "@/app/_server/actions/note";
import { getCurrentUser } from "@/app/_server/actions/users";
import { NotesPageClient } from "@/app/_components/FeatureComponents/Notes/NotesPageClient";
import { Note } from "@/app/_types";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const [notesResult, userRecord] = await Promise.all([
    getUserNotes(),
    getCurrentUser(),
  ]);

  const notes = notesResult.success && notesResult.data ? notesResult.data : [];
  const user = sanitizeUserForClient(userRecord);

  return (
    <NotesPageClient
      initialNotes={notes as Note[]}
      user={user}
    />
  );
}
