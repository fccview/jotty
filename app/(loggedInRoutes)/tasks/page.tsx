import { getUserChecklists } from "@/app/_server/actions/checklist";
import { getCurrentUser } from "@/app/_server/actions/users";
import { TasksPageClient } from "@/app/_components/FeatureComponents/Checklists/TasksPageClient";
import { Checklist } from "@/app/_types";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [listsResult, userRecord] = await Promise.all([
    getUserChecklists(),
    getCurrentUser(),
  ]);

  const lists = listsResult.success && listsResult.data ? listsResult.data : [];
  const taskLists = lists.filter((list) => list.type === "task") as Checklist[];
  const user = sanitizeUserForClient(userRecord);

  return (
    <TasksPageClient
      initialLists={taskLists}
      user={user}
    />
  );
}
