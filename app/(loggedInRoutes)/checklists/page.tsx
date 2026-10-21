import { getUserChecklists } from "@/app/_server/actions/checklist/queries";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getCategories } from "@/app/_server/actions/category";
import { ChecklistsPageClient } from "@/app/_components/FeatureComponents/Checklists/ChecklistsPageClient";
import { BrowseLayout } from "@/app/_components/FeatureComponents/Browse/BrowseLayout";
import { Checklist } from "@/app/_types";
import { Modes } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export default async function ChecklistsPage() {
  const [listsResult, user, categoriesResult] = await Promise.all([
    getUserChecklists(),
    getCurrentUser(),
    getCategories(Modes.CHECKLISTS),
  ]);

  const lists = listsResult.success && listsResult.data ? listsResult.data : [];
  const categories = categoriesResult.data || [];

  return (
    <BrowseLayout mode={Modes.CHECKLISTS} categories={categories} user={user}>
      <ChecklistsPageClient
        initialLists={lists as Checklist[]}
        categories={categories}
        user={user}
      />
    </BrowseLayout>
  );
}
