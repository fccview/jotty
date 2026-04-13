import { redirect } from "next/navigation";
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
import { decodeCategoryPath, decodeId } from "@/app/_utils/global-utils";
import { PermissionsProvider } from "@/app/_providers/PermissionsProvider";
import { MetadataProvider } from "@/app/_providers/MetadataProvider";

interface NotePageProps {
  params: Promise<{
    user: string;
    uuid: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata(props: NotePageProps): Promise<Metadata> {
  const params = await props.params;
  const { user, uuid } = params;
  return getMedatadaTitle(Modes.NOTES, decodeId(uuid), decodeURIComponent(user));
}

export default async function NotePage(props: NotePageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { user: ownerUsername, uuid } = params;
  const id = decodeId(uuid);
  const owner = decodeURIComponent(ownerUsername);
  
  const categoryFallbackRaw = searchParams?.c;
  const categoryFallback = Array.isArray(categoryFallbackRaw) 
    ? categoryFallbackRaw[0] 
    : categoryFallbackRaw;

  const user = await getCurrentUser();
  const username = user?.username || "";
  const hasContentAccess = await canAccessAllContent();

  await CheckForNeedsMigration();

  const categoriesResult = await getCategories(Modes.NOTES);

  let note = await getNoteById(id, owner, username, false, categoryFallback);

  if (!note && hasContentAccess) {
    note = await getNoteById(id, owner, undefined, false, categoryFallback);
  }

  if (!note) {
    redirect("/");
  }

  const docsCategories =
    categoriesResult.success && categoriesResult.data
      ? categoriesResult.data
      : [];

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
        <NoteClient note={note} categories={docsCategories} />
      </PermissionsProvider>
    </MetadataProvider>
  );
}
