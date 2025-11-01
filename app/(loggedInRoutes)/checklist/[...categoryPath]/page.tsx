import { redirect } from "next/navigation";
import { getListById, getRawLists } from "@/app/_server/actions/checklist";
import { getCategories } from "@/app/_server/actions/category";
import { getAllLists } from "@/app/_server/actions/checklist";
import { getCurrentUser } from "@/app/_server/actions/users";
import { ChecklistClient } from "@/app/_components/FeatureComponents/Checklists/Parts/ChecklistClient";
import { Modes } from "@/app/_types/enums";
import type { Metadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { decodeCategoryPath, decodeId } from "@/app/_utils/global-utils";

interface ChecklistPageProps {
  params: {
    categoryPath: string[];
  };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ChecklistPageProps): Promise<Metadata> {
  const { categoryPath } = params;
  const id = decodeId(categoryPath[categoryPath.length - 1]);
  const encodedCategoryPath = categoryPath.slice(0, -1).join("/");
  const category =
    categoryPath.length === 1
      ? "Uncategorized"
      : decodeCategoryPath(encodedCategoryPath);

  return getMedatadaTitle(Modes.CHECKLISTS, id, category);
}

export default async function ChecklistPage({ params }: ChecklistPageProps) {
  const { categoryPath } = params;
  const id = decodeId(categoryPath[categoryPath.length - 1]);
  const encodedCategoryPath = categoryPath.slice(0, -1).join("/");
  const category =
    categoryPath.length === 1
      ? "Uncategorized"
      : decodeCategoryPath(encodedCategoryPath);
  const user = await getCurrentUser();
  const username = user?.username || "";
  const isAdminUser = user?.isAdmin || false;

  const [listsResult, categoriesResult] = await Promise.all([
    getRawLists(username),
    getCategories(Modes.CHECKLISTS),
  ]);

  if (!listsResult.success || !listsResult.data) {
    redirect("/");
  }

  let checklist = await getListById(id, username, category);

  if (!checklist && isAdminUser) {
    const allListsResult = await getAllLists();
    if (allListsResult.success && allListsResult.data) {
      checklist = allListsResult.data.find(
        (list) => list.id === id && list.category === category
      );
    }
  }

  if (!checklist) {
    redirect("/");
  }

  const categories =
    categoriesResult.success && categoriesResult.data
      ? categoriesResult.data
      : [];

  return (
    <ChecklistClient
      checklist={checklist}
      categories={categories}
      user={user}
    />
  );
}
