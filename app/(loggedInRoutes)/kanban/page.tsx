import { browsePage, browseQueryOf, defaultFilterOf } from "@/app/_server/actions/browse/page";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getCategories } from "@/app/_server/actions/category";
import { KanbanPageClient } from "@/app/_components/FeatureComponents/Kanban/KanbanPageClient";
import { BrowseLayout } from "@/app/_components/FeatureComponents/Browse/BrowseLayout";
import { BrowsePage, Checklist } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { BrowseScope } from "@/app/_consts/browse";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const [firstPage, categoriesResult] = await Promise.all([
    browsePage(
      BrowseScope.BOARDS,
      user,
      browseQueryOf(BrowseScope.BOARDS, {}, defaultFilterOf(BrowseScope.BOARDS, user)),
    ),
    getCategories(Modes.CHECKLISTS),
  ]);

  const categories = categoriesResult.data || [];

  return (
    <BrowseLayout mode={Modes.CHECKLISTS} categories={categories} user={user}>
      <KanbanPageClient
        initialPage={firstPage as BrowsePage<Checklist>}
        categories={categories}
        user={user}
      />
    </BrowseLayout>
  );
}
