import { getUserChecklists } from "@/app/_server/actions/checklist";
import { getCurrentUser } from "@/app/_server/actions/users";
import { TasksPageClient } from "@/app/_components/FeatureComponents/Checklists/TasksPageClient";
import { Checklist } from "@/app/_types";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [listsResult, user] = await Promise.all([
    getUserChecklists(),
    getCurrentUser(),
  ]);

  const lists = listsResult.success && listsResult.data ? listsResult.data : [];
  const taskLists = lists.filter((list) => list.type === "task") as Checklist[];

  return (
    <TasksPageClient
      initialLists={taskLists}
      user={user}
    />
  );
}
