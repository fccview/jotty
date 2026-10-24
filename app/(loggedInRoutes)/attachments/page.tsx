import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AttachmentsPageClient } from "@/app/_components/FeatureComponents/Attachments/AttachmentsPageClient";
import { BrowseLayout } from "@/app/_components/FeatureComponents/Browse/BrowseLayout";
import { getCategories } from "@/app/_server/actions/category";
import { getCurrentUser } from "@/app/_server/actions/users";
import { attachmentFolders } from "@/app/_server/actions/attachments/browse";
import { Modes } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("attachments");
  return { title: t("title") };
}

export default async function AttachmentsPage() {
  const [user, categoriesResult, foldersResult] = await Promise.all([
    getCurrentUser(),
    getCategories(Modes.NOTES),
    attachmentFolders(0),
  ]);

  const categories = categoriesResult.success ? categoriesResult.data || [] : [];

  return (
    <BrowseLayout mode={Modes.NOTES} categories={categories} user={user}>
      <AttachmentsPageClient
        initialFolders={foldersResult.success ? foldersResult.data : undefined}
      />
    </BrowseLayout>
  );
}
