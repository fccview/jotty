import { getCategories } from "@/app/_server/actions/category";
import { getUserChecklists } from "@/app/_server/actions/checklist";
import {
  getUserNotes,
  CheckForNeedsMigration,
} from "@/app/_server/actions/note";
import { HomeClient } from "@/app/_components/FeatureComponents/Home/HomeClient";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";
import { Checklist, Note } from "../_types";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";
import { HOMEPAGE_ITEMS_LIMIT } from "@/app/_consts/files";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await CheckForNeedsMigration();

  const [listsResult, notesResult, categoriesResult, notesCategoriesResult] =
    await Promise.all([
      getUserChecklists({ limit: HOMEPAGE_ITEMS_LIMIT }),
      getUserNotes({ limit: HOMEPAGE_ITEMS_LIMIT }),
      getCategories(Modes.CHECKLISTS),
      getCategories(Modes.NOTES),
    ]);

  console.log("limit", HOMEPAGE_ITEMS_LIMIT);

  console.log("listsResult", listsResult.data?.length);
  console.log("notesResult", notesResult.data?.length);

  const lists = listsResult.success && listsResult.data ? listsResult.data : [];
  const notes = notesResult.success && notesResult.data ? notesResult.data : [];

  const categories =
    categoriesResult.success && categoriesResult.data
      ? categoriesResult.data
      : [];

  const notesCategories =
    notesCategoriesResult.success && notesCategoriesResult.data
      ? notesCategoriesResult.data
      : [];

  const user = sanitizeUserForClient(await getCurrentUser());

  return (
    <HomeClient
      initialLists={lists as Checklist[]}
      initialCategories={categories}
      initialDocs={notes as Note[]}
      initialDocsCategories={notesCategories}
      user={user}
    />
  );
}
