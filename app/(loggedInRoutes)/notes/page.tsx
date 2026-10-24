import { wantedBodies } from "@/app/_server/actions/note/browse";
import { browsePage, browseQueryOf, defaultFilterOf } from "@/app/_server/actions/browse/page";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getCategories } from "@/app/_server/actions/category";
import { NotesPageClient } from "@/app/_components/FeatureComponents/Notes/NotesPageClient";
import { BrowseLayout } from "@/app/_components/FeatureComponents/Browse/BrowseLayout";
import { BrowsePage, Note } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { BrowseScope } from "@/app/_consts/browse";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const [firstPage, categoriesResult] = await Promise.all([
    wantedBodies(user).then((bodies) =>
      browsePage(
        BrowseScope.NOTES,
        user,
        browseQueryOf(BrowseScope.NOTES, {}, defaultFilterOf(BrowseScope.NOTES, user)),
        bodies,
      ),
    ),
    getCategories(Modes.NOTES),
  ]);

  const categories = categoriesResult.data || [];

  return (
    <BrowseLayout mode={Modes.NOTES} categories={categories} user={user}>
      <NotesPageClient
        initialPage={firstPage as BrowsePage<Note>}
        categories={categories}
        user={user}
      />
    </BrowseLayout>
  );
}
