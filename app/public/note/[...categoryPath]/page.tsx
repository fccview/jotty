import { redirect } from "next/navigation";
import { getAllNotes, getNoteById } from "@/app/_server/actions/note";
import { PublicNoteView } from "@/app/_components/FeatureComponents/PublicView/PublicNoteView";
import { getCurrentUser, getUserByUsername } from "@/app/_server/actions/users";
import type { Metadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { Modes } from "@/app/_types/enums";
import { decodeCategoryPath, decodeId } from "@/app/_utils/global-utils";
import { isItemSharedWith } from "@/app/_server/actions/sharing";
import { MetadataProvider } from "@/app/_providers/MetadataProvider";
import { PermissionsProvider } from "@/app/_providers/PermissionsProvider";
import { sanitizeUserForPublic } from "@/app/_utils/user-sanitize-utils";

interface PublicNotePageProps {
  params: Promise<{
    categoryPath: string[];
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PublicNotePageProps): Promise<Metadata> {
  const params = await props.params;
  const { categoryPath } = params;
  const id = decodeId(categoryPath[categoryPath.length - 1]);
  const encodedCategoryPath = categoryPath.slice(0, -1).join("/");
  const category =
    categoryPath.length === 1
      ? "Uncategorized"
      : decodeCategoryPath(encodedCategoryPath);

  return getMedatadaTitle(Modes.NOTES, id, category);
}

export default async function PublicNotePage(props: PublicNotePageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { categoryPath } = params;
  const id = decodeId(categoryPath[categoryPath.length - 1]);
  const encodedCategoryPath = categoryPath.slice(0, -1).join("/");
  const category =
    categoryPath.length === 1
      ? "Uncategorized"
      : decodeCategoryPath(encodedCategoryPath);

  const isUuidOnly = categoryPath.length === 1;
  let note = await getNoteById(id, isUuidOnly ? undefined : category);

  if (!note) {
    const notesResult = await getAllNotes();
    if (!notesResult.success || !notesResult.data) {
      redirect("/");
    }

    note = notesResult.data.find(
      (n) => n.id === id && n.category === category
    );

    if (!note && isUuidOnly) {
      note = notesResult.data.find(
        (n) => n.id === id && n.category === "Uncategorized"
      );

      if (!note) {
        note = notesResult.data.find((n) => n.id === id);
      }
    }
  }

  if (!note) {
    redirect("/");
  }

  const userRecord = await getUserByUsername(note.owner!);
  const user = sanitizeUserForPublic(
    userRecord,
    !!process.env.SERVE_PUBLIC_IMAGES
  );

  const isPubliclyShared = await isItemSharedWith(
    note.uuid || id,
    category,
    "note",
    "public"
  );
  const isPrintView = searchParams.view_mode === "print";

  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.username === note.owner;

  if (isPubliclyShared || isOwner || (isOwner && isPrintView)) {
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
          <PublicNoteView note={note} user={user} />
        </PermissionsProvider>
      </MetadataProvider>
    );
  }

  redirect("/");
}
