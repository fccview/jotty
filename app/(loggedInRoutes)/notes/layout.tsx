import { NotesClient } from "@/app/_components/FeatureComponents/Notes/NotesClient";
import { getCategories } from "@/app/_server/actions/category";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";

export default async function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [noteCategories, userRecord] = await Promise.all([
    getCategories(Modes.NOTES),
    getCurrentUser(),
  ]);

  const categories = noteCategories.data || [];
  const user = sanitizeUserForClient(userRecord);

  return (
    <NotesClient categories={categories} user={user}>
      {children}
    </NotesClient>
  );
}
