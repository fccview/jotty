import { getUserChecklists } from "@/app/_server/actions/checklist/queries";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getCategories } from "@/app/_server/actions/category";
import { KanbanPageClient } from "@/app/_components/FeatureComponents/Kanban/KanbanPageClient";
import { BrowseLayout } from "@/app/_components/FeatureComponents/Browse/BrowseLayout";
import { Checklist } from "@/app/_types";
import { isKanbanType, Modes } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const [listsResult, user, categoriesResult] = await Promise.all([
    getUserChecklists({ summarize: true }),
    getCurrentUser(),
    getCategories(Modes.CHECKLISTS),
  ]);

  const lists = listsResult.success && listsResult.data ? listsResult.data : [];
  const boards = lists.filter((list) => isKanbanType(list.type)) as Checklist[];
  const categories = categoriesResult.data || [];

  return (
    <BrowseLayout mode={Modes.CHECKLISTS} categories={categories} user={user}>
      <KanbanPageClient initialLists={boards} categories={categories} user={user} />
    </BrowseLayout>
  );
}
