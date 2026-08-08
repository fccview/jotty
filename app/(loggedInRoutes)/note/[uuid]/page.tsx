import { redirect, permanentRedirect } from "next/navigation";
import {
  CheckForNeedsMigration,
  getNoteById,
} from "@/app/_server/actions/note";
import {
  getCurrentUser,
  canAccessAllContent,
} from "@/app/_server/actions/users";
import { NoteClient } from "@/app/_components/FeatureComponents/Notes/NoteClient";
import { Modes } from "@/app/_types/enums";
import { getCategories } from "@/app/_server/actions/category";
import type { Metadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { isUuid } from "@/app/_consts/identity";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { PermissionsProvider } from "@/app/_providers/PermissionsProvider";
import { MetadataProvider } from "@/app/_providers/MetadataProvider";
import { decodeSegment } from "@/app/_utils/global-utils";

interface NotePageProps {
  params: Promise<{
    uuid: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata(props: NotePageProps): Promise<Metadata> {
  const params = await props.params;
  return getMedatadaTitle(Modes.NOTES, params.uuid);
}

export default async function NotePage(props: NotePageProps) {
  const params = await props.params;
  const { uuid } = params;

  const user = await getCurrentUser();

  if (!user?.username) {
    redirect("/");
  }

  const username = user.username;
  const hasContentAccess = await canAccessAllContent();

  if (!isUuid(uuid)) {
    const { legacyResolve } = await import("@/app/_server/actions/lib/legacy-lookup");
    const resolved = await legacyResolve(
      Modes.NOTES,
      UNCATEGORIZED,
      decodeSegment(uuid),
      username,
    );

    if (resolved) {
      permanentRedirect(`/note/${resolved}`);
    }

    redirect("/");
  }

  await CheckForNeedsMigration();

  const categoriesResult = await getCategories(Modes.NOTES);

  let note = await getNoteById(uuid, username);

  if (!note && hasContentAccess) {
    note = await getNoteById(uuid);
  }

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
    category: note.category || UNCATEGORIZED,
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
