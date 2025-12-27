import { getUserChecklists } from "@/app/_server/actions/checklist";
import { getCurrentUser } from "@/app/_server/actions/users";
import { ChecklistsPageClient } from "@/app/_components/FeatureComponents/Checklists/ChecklistsPageClient";
import { Checklist } from "@/app/_types";

export const dynamic = "force-dynamic";

export default async function ChecklistsPage() {
  const [listsResult, user] = await Promise.all([
    getUserChecklists(),
    getCurrentUser(),
  ]);

  const lists = listsResult.success && listsResult.data ? listsResult.data : [];

  return (
    <ChecklistsPageClient
      initialLists={lists as Checklist[]}
      user={user}
    />
  );
}
