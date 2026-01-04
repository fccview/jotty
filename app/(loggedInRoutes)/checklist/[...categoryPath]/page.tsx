import { redirect } from "next/navigation";
import {
  getListById,
  getUserChecklists,
} from "@/app/_server/actions/checklist";
import { getCategories } from "@/app/_server/actions/category";
import { getAllLists } from "@/app/_server/actions/checklist";
import { getCurrentUser, canAccessAllContent } from "@/app/_server/actions/users";
import { ChecklistClient } from "@/app/_components/FeatureComponents/Checklists/Parts/ChecklistClient";
import { Modes } from "@/app/_types/enums";
import type { Metadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { decodeCategoryPath, decodeId } from "@/app/_utils/global-utils";
import { PermissionsProvider } from "@/app/_providers/PermissionsProvider";
import { MetadataProvider } from "@/app/_providers/MetadataProvider";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";

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
  const userRecord = await getCurrentUser();
  const username = userRecord?.username || "";
  const hasContentAccess = await canAccessAllContent();

  const [listsResult, categoriesResult] = await Promise.all([
    getUserChecklists({ username }),
    getCategories(Modes.CHECKLISTS),
  ]);

  if (!listsResult.success || !listsResult.data) {
    redirect("/");
  }

  let checklist = await getListById(id, username, category);

  if (!checklist && hasContentAccess) {
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

  const metadata = {
    id: checklist.id,
    uuid: checklist.uuid,
    title: checklist.title,
    category: checklist.category || "Uncategorized",
    owner: checklist.owner,
    createdAt: checklist.createdAt,
    updatedAt: checklist.updatedAt,
    type: "checklist" as const,
  };

  const user = sanitizeUserForClient(userRecord);

  return (
    <MetadataProvider metadata={metadata}>
      <PermissionsProvider item={checklist}>
        <ChecklistClient
          checklist={checklist}
          categories={categories}
          user={user}
        />
      </PermissionsProvider>
    </MetadataProvider>
  );
}
