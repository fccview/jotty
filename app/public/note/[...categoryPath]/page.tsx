import { redirect } from "next/navigation";
import { getAllNotes } from "@/app/_server/actions/note";
import { PublicNoteView } from "@/app/_components/FeatureComponents/PublicView/PublicNoteView";
import { getCurrentUser, getUserByUsername } from "@/app/_server/actions/users";
import type { Metadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { Modes } from "@/app/_types/enums";
import { decodeCategoryPath, decodeId } from "@/app/_utils/global-utils";
import { isItemSharedWith } from "@/app/_server/actions/sharing";

interface PublicNotePageProps {
  params: {
    categoryPath: string[];
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PublicNotePageProps): Promise<Metadata> {
  const { categoryPath } = params;
  const id = decodeId(categoryPath[categoryPath.length - 1]);
  const encodedCategoryPath = categoryPath.slice(0, -1).join("/");
  const category =
    categoryPath.length === 1
      ? "Uncategorized"
      : decodeCategoryPath(encodedCategoryPath);

  return getMedatadaTitle(Modes.NOTES, id, category);
}

export default async function PublicNotePage({
  params,
  searchParams,
}: PublicNotePageProps) {
  const { categoryPath } = params;
  const id = decodeId(categoryPath[categoryPath.length - 1]);
  const encodedCategoryPath = categoryPath.slice(0, -1).join("/");
  const category =
    categoryPath.length === 1
      ? "Uncategorized"
      : decodeCategoryPath(encodedCategoryPath);

  const docsResult = await getAllNotes();
  if (!docsResult.success || !docsResult.data) {
    redirect("/");
  }

  let note = docsResult.data.find(
    (doc) => doc.id === id && doc.category === category
  );

  if (!note && categoryPath.length === 1) {
    note = docsResult.data.find(
      (doc) => doc.id === id && doc.category === "Uncategorized"
    );

    if (!note) {
      note = docsResult.data.find((doc) => doc.id === id);
    }
  }

  if (!note) {
    redirect("/");
  }

  const user = await getUserByUsername(note.owner!);
  if (user) {
    user.avatarUrl = process.env.SERVE_PUBLIC_IMAGES
      ? user.avatarUrl
      : undefined;
  }

  const isPubliclyShared = await isItemSharedWith(id, category, "note", "public");
  const isPrintView = searchParams.view_mode === "print";

  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.username === note.owner;

  if (isPubliclyShared || isOwner || (isOwner && isPrintView)) {
    return <PublicNoteView note={note} user={user} />;
  }

  redirect("/");
}