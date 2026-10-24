import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArchivePageClient } from "@/app/_components/FeatureComponents/Archive/ArchivePageClient";
import { BrowseLayout } from "@/app/_components/FeatureComponents/Browse/BrowseLayout";
import { getArchivedItems } from "@/app/_server/actions/archived";
import { getCategories } from "@/app/_server/actions/category";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("archiveTab") };
}

export default async function ArchivePage() {
  const [user, archivedResult, listsCategoriesResult, notesCategoriesResult] =
    await Promise.all([
      getCurrentUser(),
      getArchivedItems(),
      getCategories(Modes.CHECKLISTS),
      getCategories(Modes.NOTES),
    ]);

  const archivedItems = archivedResult.success ? archivedResult.data : [];
  const listsCategories = listsCategoriesResult.success
    ? listsCategoriesResult.data
    : [];
  const notesCategories = notesCategoriesResult.success
    ? notesCategoriesResult.data
    : [];

  return (
    <BrowseLayout mode={Modes.NOTES} categories={notesCategories || []} user={user}>
      <ArchivePageClient
        archivedItems={archivedItems || []}
        listsCategories={listsCategories || []}
        notesCategories={notesCategories || []}
      />
    </BrowseLayout>
  );
}
