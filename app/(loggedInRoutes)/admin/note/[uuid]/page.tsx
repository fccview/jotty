import { redirect } from "next/navigation";
import { CheckForNeedsMigration } from "@/app/_server/actions/note";
import { getNoteById, getUserNotes } from "@/app/_server/actions/note/queries";
import { getCurrentUser, canAccessAllContent } from "@/app/_server/actions/users";
import { NoteClient } from "@/app/_components/FeatureComponents/Notes/NoteClient";
import { Modes } from "@/app/_types/enums";
import { getCategories } from "@/app/_server/actions/category";
import type { Metadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { PermissionsProvider } from "@/app/_providers/PermissionsProvider";
import { MetadataProvider } from "@/app/_providers/MetadataProvider";
import { RelationsProvider } from "@/app/_providers/RelationsProvider";
import { getItemRelations } from "@/app/_server/actions/relations";

interface AdminNotePageProps {
  params: Promise<{
    uuid: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata(props: AdminNotePageProps): Promise<Metadata> {
  const params = await props.params;
  const { uuid } = params;
  return getMedatadaTitle(Modes.NOTES, uuid);
}

/**
 * Render a note with metadata and relations for a user with access to all content.
 * Run legacy note migration first and redirect home if access or loading fails.
 */
export default async function AdminNotePage(props: AdminNotePageProps) {
  const params = await props.params;
  const { uuid } = params;
  const hasContentAccess = await canAccessAllContent();

  if (!hasContentAccess) {
    redirect("/");
  }

  await CheckForNeedsMigration();

  const [docsResult, categoriesResult] = await Promise.all([
    getUserNotes({ isRaw: true }),
    getCategories(Modes.NOTES),
  ]);

  if (!docsResult.success || !docsResult.data) {
    redirect("/");
  }

  const note = await getNoteById(uuid);

  if (!note) {
    redirect("/");
  }

  const docsCategories =
    categoriesResult.success && categoriesResult.data
      ? categoriesResult.data
      : [];

  const metadata = {
    id: note.id,
    uuid: note.uuid,
    title: note.title,
    category: note.category || "Uncategorized",
    owner: note.owner,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    type: "note" as const,
  };

  const relations = await getItemRelations(note.uuid || "");

  return (
    <MetadataProvider metadata={metadata}>
      <PermissionsProvider item={note}>
        <RelationsProvider relations={relations}>
          <NoteClient note={note} categories={docsCategories} />
        </RelationsProvider>
      </PermissionsProvider>
    </MetadataProvider>
  );
}
