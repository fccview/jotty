import { redirect } from "next/navigation";
import { getAllNotes } from "@/app/_server/actions/note";
import { PublicNoteView } from "@/app/_components/FeatureComponents/PublicView/PublicNoteView";
import { getCurrentUser, getUserByUsername } from "@/app/_server/actions/users";
import type { Metadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { Modes } from "@/app/_types/enums";
import { decodeId } from "@/app/_utils/global-utils";
import { isItemSharedWith } from "@/app/_server/actions/sharing";
import { ItemTypes } from "@/app/_types/enums";
import { MetadataProvider } from "@/app/_providers/MetadataProvider";
import { PermissionsProvider } from "@/app/_providers/PermissionsProvider";
import { sanitizeUserForPublic } from "@/app/_utils/user-sanitize-utils";
import { isEnvEnabled } from "@/app/_utils/env-utils";

interface PublicNotePageProps {
  params: Promise<{
    uuid: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PublicNotePageProps,
): Promise<Metadata> {
  const params = await props.params;
  const { uuid } = params;

  return getMedatadaTitle(Modes.NOTES, decodeId(uuid), "Uncategorized");
}

export default async function PublicNotePage(props: PublicNotePageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { uuid } = params;
  const id = decodeId(uuid);

  let note = undefined;

  const notesResult = await getAllNotes();
  if (notesResult.success && notesResult.data) {
    note = notesResult.data.find((n) => n.uuid === id || n.slug === id);
  }

  if (!note) {
    redirect("/");
  }

  const userRecord = await getUserByUsername(note.owner!);
  const user = sanitizeUserForPublic(
    userRecord,
    !!isEnvEnabled(process.env.SERVE_PUBLIC_IMAGES),
  );

  const isPubliclyShared = await isItemSharedWith(
    note.uuid || id,
    ItemTypes.NOTE,
    "public",
  );
  const isPrintView = searchParams.view_mode === "print";

  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.username === note.owner;

  if (isPubliclyShared || isOwner || (isOwner && isPrintView)) {
    const metadata = {
      id: note.slug,
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
          <PublicNoteView note={note} user={user} />
        </PermissionsProvider>
      </MetadataProvider>
    );
  }

  redirect("/");
}
