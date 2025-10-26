import { getLists } from "@/app/_server/actions/checklist";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";
import { TasksPageClient } from "@/app/_components/FeatureComponents/Checklists/TasksPageClient";
import { getCategories } from "@/app/_server/actions/category";
import { Checklist } from "@/app/_types";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [listsResult, categoriesResult] = await Promise.all([
    getLists(),
    getCategories(Modes.CHECKLISTS),
  ]);

  const lists = listsResult.success && listsResult.data ? listsResult.data : [];
  const categories =
    categoriesResult.success && categoriesResult.data
      ? categoriesResult.data
      : [];
  const user = await getCurrentUser();

  const taskLists = lists.filter((list: Checklist) => list.type === "task");

  return (
    <TasksPageClient
      initialLists={taskLists}
      initialCategories={categories}
      user={user}
    />
  );
}
