import { redirect } from "next/navigation";
import { getAllNotes } from "@/app/_server/actions/note";
import { getItemSharingMetadata } from "@/app/_server/actions/sharing";
import { PublicNoteView } from "@/app/_components/FeatureComponents/PublicView/PublicNoteView";
import { getUserByUsername } from "@/app/_server/actions/users";
import type { Metadata, ResolvingMetadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { Modes } from "@/app/_types/enums";
import { decodeCategoryPath } from "@/app/_utils/global-utils";

interface PublicNotePageProps {
  params: {
    categoryPath: string[];
  };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PublicNotePageProps): Promise<Metadata> {
  const { categoryPath } = params;
  const id = categoryPath[categoryPath.length - 1];
  const encodedCategoryPath = categoryPath.slice(0, -1).join("/");
  const category =
    categoryPath.length === 1
      ? "Uncategorized"
      : decodeCategoryPath(encodedCategoryPath);

  return getMedatadaTitle(Modes.NOTES, id, category);
}

export default async function PublicNotePage({ params }: PublicNotePageProps) {
  const { categoryPath } = params;
  const id = categoryPath[categoryPath.length - 1];
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

  const sharingMetadata = await getItemSharingMetadata(id, "note", note.owner!);
  const user = await getUserByUsername(note.owner!);
  if (user) {
    user.avatarUrl = process.env.SERVE_PUBLIC_IMAGES
      ? user.avatarUrl
      : undefined;
  }

  if (!sharingMetadata || !sharingMetadata.isPubliclyShared) {
    redirect("/");
  }

  return <PublicNoteView note={note} user={user} />;
}
