import { redirect, permanentRedirect } from "next/navigation";
import { getNoteById } from "@/app/_server/actions/note";
import { isUuid } from "@/app/_consts/identity";
import { PublicNoteView } from "@/app/_components/FeatureComponents/PublicView/PublicNoteView";
import { getCurrentUser, getUserByUsername } from "@/app/_server/actions/users";
import type { Metadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { Modes } from "@/app/_types/enums";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { isItemSharedWith } from "@/app/_server/actions/sharing";
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
  return getMedatadaTitle(Modes.NOTES, params.uuid);
}

export default async function PublicNotePage(props: PublicNotePageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { uuid } = params;

  if (!isUuid(uuid)) {
    const { legacyResolve } = await import("@/app/_server/lib/legacy-lookup");
    const resolved = await legacyResolve(
      Modes.NOTES,
      UNCATEGORIZED,
      decodeURIComponent(uuid),
    );

    if (resolved) {
      permanentRedirect(`/public/note/${resolved}`);
    }

    redirect("/");
  }

  const note = await getNoteById(uuid);

  if (!note) {
    redirect("/");
  }

  const userRecord = await getUserByUsername(note.owner!);
  const user = sanitizeUserForPublic(
    userRecord,
    !!isEnvEnabled(process.env.SERVE_PUBLIC_IMAGES),
  );

  const isPubliclyShared = await isItemSharedWith(
    note.uuid!,
    "note",
    "public",
  );
  const isPrintView = searchParams.view_mode === "print";

  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.username === note.owner;

  if (isPubliclyShared || isOwner || (isOwner && isPrintView)) {
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
          <PublicNoteView note={note} user={user} />
        </PermissionsProvider>
      </MetadataProvider>
    );
  }

  redirect("/");
}
