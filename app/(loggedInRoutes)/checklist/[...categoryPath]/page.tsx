import { redirect } from "next/navigation";
import { getLists } from "@/app/_server/actions/checklist";
import { getCategories } from "@/app/_server/actions/category";
import { getAllLists } from "@/app/_server/actions/checklist";
import { getAllSharingStatuses } from "@/app/_server/actions/sharing";
import { getCurrentUser } from "@/app/_server/actions/users";
import { ChecklistClient } from "@/app/_components/FeatureComponents/Checklists/Parts/ChecklistClient";
import { Modes } from "@/app/_types/enums";
import type { Metadata, ResolvingMetadata } from "next";
import { getMedatadaTitle, getSettings } from "@/app/_server/actions/config";
import { decodeCategoryPath } from "@/app/_utils/global-utils";

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
  const id = categoryPath[categoryPath.length - 1];
  const encodedCategoryPath = categoryPath.slice(0, -1).join("/");
  const category =
    categoryPath.length === 1
      ? "Uncategorized"
      : decodeCategoryPath(encodedCategoryPath);

  return getMedatadaTitle(Modes.CHECKLISTS, id, category);
}

export default async function ChecklistPage({ params }: ChecklistPageProps) {
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

  const [listsResult, categoriesResult] = await Promise.all([
    getLists(username),
    getCategories(Modes.CHECKLISTS),
  ]);

  if (!listsResult.success || !listsResult.data) {
    redirect("/");
  }

  let checklist = listsResult.data.find(
    (list) => list.id === id && list.category === category
  );

  if (!checklist) {
    if (categoryPath.length === 1) {
      checklist = listsResult.data.find(
        (list) => list.id === id && list.category === "Uncategorized"
      );
    }

    if (!checklist) {
      const searchScope = isAdminUser
        ? await getAllLists()
        : { success: true, data: listsResult.data };
      if (searchScope.success && searchScope.data) {
        checklist = searchScope.data.find((list) => list.id === id);
      }
    }
  }

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

  const allItems = [...listsResult.data];
  const itemsToCheck = allItems.map((item) => ({
    id: item.id,
    type: "checklist" as const,
    owner: item.owner || "",
  }));

  const sharingStatusesResult = await getAllSharingStatuses(itemsToCheck);
  const sharingStatuses =
    sharingStatusesResult.success && sharingStatusesResult.data
      ? sharingStatusesResult.data
      : {};

  return (
    <ChecklistClient
      checklist={checklist}
      lists={listsResult.data}
      categories={categories}
      sharingStatuses={sharingStatuses}
      user={user}
    />
  );
}
