import { redirect } from "next/navigation";
import { getAllLists } from "@/app/_server/actions/checklist";
import { PublicChecklistView } from "@/app/_components/FeatureComponents/PublicView/PublicChecklistView";
import { CheckForNeedsMigration } from "@/app/_server/actions/note";
import { getCurrentUser, getUserByUsername } from "@/app/_server/actions/users";
import type { Metadata } from "next";
import { Modes } from "@/app/_types/enums";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { decodeCategoryPath, decodeId } from "@/app/_utils/global-utils";
import { sharingInfo } from "@/app/_utils/sharing-utils";
import { isItemSharedWith } from "@/app/_server/actions/sharing";

interface PublicChecklistPageProps {
  params: {
    categoryPath: string[];
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams
}: PublicChecklistPageProps): Promise<Metadata> {
  const { categoryPath } = params;
  const id = decodeId(categoryPath[categoryPath.length - 1]);
  const encodedCategoryPath = categoryPath.slice(0, -1).join("/");
  const category =
    categoryPath.length === 1
      ? "Uncategorized"
      : decodeCategoryPath(encodedCategoryPath);

  return getMedatadaTitle(Modes.CHECKLISTS, id, category);
}

export default async function PublicChecklistPage({
  params,
  searchParams,
}: PublicChecklistPageProps) {
  const { categoryPath } = params;
  const id = decodeId(categoryPath[categoryPath.length - 1]);
  const encodedCategoryPath = categoryPath.slice(0, -1).join("/");
  const category =
    categoryPath.length === 1
      ? "Uncategorized"
      : decodeCategoryPath(encodedCategoryPath);

  await CheckForNeedsMigration();

  const listsResult = await getAllLists();
  if (!listsResult.success || !listsResult.data) {
    redirect("/");
  }

  let checklist = listsResult.data.find(
    (list) => list.id === id && list.category === category
  );

  if (!checklist && categoryPath.length === 1) {
    checklist = listsResult.data.find(
      (list) => list.id === id && list.category === "Uncategorized"
    );

    if (!checklist) {
      checklist = listsResult.data.find((list) => list.id === id);
    }
  }

  if (!checklist) {
    redirect("/");
  }

  const user = await getUserByUsername(checklist.owner!);
  if (user) {
    user.avatarUrl = process.env.SERVE_PUBLIC_IMAGES
      ? user.avatarUrl
      : undefined;
  }

  const isPubliclyShared = await isItemSharedWith(id, category, "checklist", "public");
  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.username === checklist.owner;
  const isPrintView = searchParams?.view_mode === "print";

  if (isPubliclyShared || isOwner || (isOwner && isPrintView)) {
    return <PublicChecklistView checklist={checklist} user={user} />;
  }

  redirect("/");
}
