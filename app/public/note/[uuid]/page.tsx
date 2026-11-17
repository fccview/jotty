import { redirect, permanentRedirect } from "next/navigation";
import { isUuid } from "@/app/_consts/identity";
import { PublicNoteView } from "@/app/_components/FeatureComponents/PublicView/PublicNoteView";
import { OwnerTheme } from "@/app/_components/FeatureComponents/PublicView/Parts/OwnerTheme";
import { loadPublicNote } from "@/app/_server/actions/note/public-view";
import type { Metadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { Modes, ItemTypes } from "@/app/_types/enums";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { MetadataProvider } from "@/app/_providers/MetadataProvider";
import { PermissionsProvider } from "@/app/_providers/PermissionsProvider";
import { decodeSegment } from "@/app/_utils/global-utils";

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
  const params = await props.params;
  const { uuid } = params;

  if (!isUuid(uuid)) {
    const { publicResolve } = await import("@/app/_server/actions/lib/legacy-lookup");
    const resolved = await publicResolve(
      Modes.NOTES,
      UNCATEGORIZED,
      decodeSegment(uuid),
      ItemTypes.NOTE,
    );

    if (resolved) {
      permanentRedirect(`/public/note/${resolved}`);
    }

    redirect("/");
  }

  const payload = await loadPublicNote(uuid);

  if (!payload) {
    redirect("/");
  }

  const { note, user, theme, links } = payload;
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
        <OwnerTheme theme={theme} />
        <PublicNoteView note={note} user={user} links={links} />
      </PermissionsProvider>
    </MetadataProvider>
  );
}
