import { redirect } from "next/navigation";
import {
  getNotes,
  getAllNotes,
  CheckForNeedsMigration,
} from "@/app/_server/actions/note";
import { getAllSharingStatuses } from "@/app/_server/actions/sharing";
import { getCurrentUser } from "@/app/_server/actions/users";
import { NoteClient } from "@/app/_components/FeatureComponents/Notes/NoteClient";
import { Modes } from "@/app/_types/enums";
import { getCategories } from "@/app/_server/actions/category";
import type { Metadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { decodeCategoryPath } from "@/app/_utils/global-utils";

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
  const id = categoryPath[categoryPath.length - 1];
  const encodedCategoryPath = categoryPath.slice(0, -1).join("/");
  const category =
    categoryPath.length === 1
      ? "Uncategorized"
      : decodeCategoryPath(encodedCategoryPath);

  return getMedatadaTitle(Modes.NOTES, id, category);
}

export default async function NotePage({ params }: NotePageProps) {
  const { categoryPath } = params;
  const id = categoryPath[categoryPath.length - 1];
  const encodedCategoryPath = categoryPath.slice(0, -1).join("/");
  const category =
    categoryPath.length === 1
      ? "Uncategorized"
      : decodeCategoryPath(encodedCategoryPath);
  const user = await getCurrentUser();
  const username = user?.username || "";
  const isAdminUser = user?.isAdmin || false;

  await CheckForNeedsMigration();

  const [docsResult, categoriesResult] = await Promise.all([
    getNotes(username),
    getCategories(Modes.NOTES),
  ]);

  if (!docsResult.success || !docsResult.data) {
    redirect("/");
  }

  let note = docsResult.data.find(
    (doc) => doc.id === id && doc.category === category
  );

  if (!note) {
    if (categoryPath.length === 1) {
      note = docsResult.data.find(
        (doc) => doc.id === id && doc.category === "Uncategorized"
      );
    }

    if (!note) {
      const searchScope = isAdminUser
        ? await getAllNotes()
        : { success: true, data: docsResult.data };
      if (searchScope.success && searchScope.data) {
        note = searchScope.data.find((doc) => doc.id === id);
      }
    }
  }

  if (!note && isAdminUser) {
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

  const allItems = [...docsResult.data];
  const itemsToCheck = allItems.map((item) => ({
    id: item.id,
    type: "note" as const,
    owner: item.owner || "",
  }));

  const sharingStatusesResult = await getAllSharingStatuses(itemsToCheck);
  const sharingStatuses =
    sharingStatusesResult.success && sharingStatusesResult.data
      ? sharingStatusesResult.data
      : {};

  return (
    <NoteClient
      note={note}
      docs={docsResult.data}
      categories={docsCategories}
      sharingStatuses={sharingStatuses}
      user={user}
    />
  );
}
