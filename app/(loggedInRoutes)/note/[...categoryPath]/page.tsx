import { redirect } from "next/navigation";
import {
  getAllNotes,
  CheckForNeedsMigration,
  getNoteById,
  getUserNotes,
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
  params: {
    categoryPath: string[];
  };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: NotePageProps): Promise<Metadata> {
  const { categoryPath } = params;
  const id = decodeId(categoryPath[categoryPath.length - 1]);
  const encodedCategoryPath = categoryPath.slice(0, -1).join("/");
  const category =
    categoryPath.length === 1
      ? "Uncategorized"
      : decodeCategoryPath(encodedCategoryPath);

  return getMedatadaTitle(Modes.NOTES, id, category);
}

export default async function NotePage({ params }: NotePageProps) {
  const { categoryPath } = params;
  const id = decodeId(categoryPath[categoryPath.length - 1]);
  const encodedCategoryPath = categoryPath.slice(0, -1).join("/");
  const category =
    categoryPath.length === 1
      ? "Uncategorized"
      : decodeCategoryPath(encodedCategoryPath);
  const user = await getCurrentUser();
  const username = user?.username || "";
  const hasContentAccess = await canAccessAllContent();

  await CheckForNeedsMigration();

  const [docsResult, categoriesResult] = await Promise.all([
    getUserNotes({ isRaw: true }),
    getCategories(Modes.NOTES),
  ]);

  if (!docsResult.success || !docsResult.data) {
    redirect("/");
  }

  let note = await getNoteById(id, category, username);

  if (!note && hasContentAccess) {
    const allDocsResult = await getAllNotes();
    if (allDocsResult.success && allDocsResult.data) {
      note = allDocsResult.data.find(
        (doc) => doc.id === id && doc.category === category
      );
    }
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
