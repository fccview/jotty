import { getUserChecklists } from "@/app/_server/actions/checklist";
import { getCurrentUser } from "@/app/_server/actions/users";
import { KanbanPageClient } from "@/app/_components/FeatureComponents/Kanban/KanbanPageClient";
import { Checklist } from "@/app/_types";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const [listsResult, userRecord] = await Promise.all([
    getUserChecklists(),
    getCurrentUser(),
  ]);

  const lists = listsResult.success && listsResult.data ? listsResult.data : [];
  const kanbanLists = lists.filter((list) => list.type === "kanban" || list.type === "task") as Checklist[];
  const user = sanitizeUserForClient(userRecord);

  return (
    <KanbanPageClient
      initialLists={kanbanLists}
      user={user}
    />
  );
}
