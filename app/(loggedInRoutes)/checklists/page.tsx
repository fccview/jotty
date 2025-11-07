import { getUserChecklists } from "@/app/_server/actions/checklist";
import { getCategories } from "@/app/_server/actions/category";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";
import { ChecklistsPageClient } from "@/app/_components/FeatureComponents/Checklists/ChecklistsPageClient";
import { Checklist } from "@/app/_types";

export const dynamic = "force-dynamic";

export default async function ChecklistsPage() {
  const [listsResult, categoriesResult] = await Promise.all([
    getUserChecklists(),
    getCategories(Modes.CHECKLISTS),
  ]);

  const lists = listsResult.success && listsResult.data ? listsResult.data : [];
  const categories =
    categoriesResult.success && categoriesResult.data
      ? categoriesResult.data
      : [];
  const user = await getCurrentUser();

  return (
    <ChecklistsPageClient
      initialLists={lists as Checklist[]}
      initialCategories={categories}
      user={user}
    />
  );
}
