import { getCategories } from "@/app/_server/actions/category";
import { getRawLists } from "@/app/_server/actions/checklist";
import { getRawNotes, CheckForNeedsMigration } from "@/app/_server/actions/note";
import { getAllSharingStatuses } from "@/app/_server/actions/sharing";
import { HomeClient } from "@/app/_components/FeatureComponents/Home/HomeClient";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await CheckForNeedsMigration();

  const [listsResult, docsResult, categoriesResult, docsCategoriesResult] =
    await Promise.all([
      getRawLists(),
      getRawNotes(),
      getCategories(Modes.CHECKLISTS),
      getCategories(Modes.NOTES),
    ]);

  const lists = listsResult.success && listsResult.data ? listsResult.data : [];
  const categories =
    categoriesResult.success && categoriesResult.data
      ? categoriesResult.data
      : [];
  const docs = docsResult.success && docsResult.data ? docsResult.data : [];
  const docsCategories =
    docsCategoriesResult.success && docsCategoriesResult.data
      ? docsCategoriesResult.data
      : [];
  const user = await getCurrentUser();

  const allItems = [...lists, ...docs];

  const itemsToCheck = allItems.map((item) => ({
    id: item.id,
    type:
      "type" in item && item.type === "task"
        ? ("checklist" as const)
        : "type" in item
          ? ("checklist" as const)
          : ("note" as const),
    owner: item.owner || "",
  }));

  const sharingStatusesResult = await getAllSharingStatuses(itemsToCheck);
  const sharingStatuses =
    sharingStatusesResult.success && sharingStatusesResult.data
      ? sharingStatusesResult.data
      : {};

  return (
    <HomeClient
      initialLists={lists}
      initialCategories={categories}
      initialDocs={docs}
      initialDocsCategories={docsCategories}
      sharingStatuses={sharingStatuses}
      user={user}
    />
  );
}
