import { redirect } from "next/navigation";
import {
  CheckForNeedsMigration,
  getNoteById,
  getUserNotes,
} from "@/app/_server/actions/note";
import { getCurrentUser, canAccessAllContent } from "@/app/_server/actions/users";
import { NoteClient } from "@/app/_components/FeatureComponents/Notes/NoteClient";
import { Modes } from "@/app/_types/enums";
import { getCategories } from "@/app/_server/actions/category";
import type { Metadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { PermissionsProvider } from "@/app/_providers/PermissionsProvider";
import { MetadataProvider } from "@/app/_providers/MetadataProvider";

interface AdminNotePageProps {
  params: {
    uuid: string;
  };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: AdminNotePageProps): Promise<Metadata> {
  const { uuid } = params;
  return getMedatadaTitle(Modes.NOTES, uuid, "Admin");
}

export default async function AdminNotePage({ params }: AdminNotePageProps) {
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

  return (
    <MetadataProvider metadata={metadata}>
      <PermissionsProvider item={note}>
        <NoteClient note={note} categories={docsCategories} />
      </PermissionsProvider>
    </MetadataProvider>
  );
}
