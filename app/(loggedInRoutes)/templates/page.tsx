import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TemplatesPageClient } from "@/app/_components/FeatureComponents/Templates/TemplatesPageClient";
import { BrowseLayout } from "@/app/_components/FeatureComponents/Browse/BrowseLayout";
import { getTemplates } from "@/app/_server/actions/template";
import { getCategories } from "@/app/_server/actions/category";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("templates");
  return { title: t("title") };
}

export default async function TemplatesPage() {
  const [user, templatesResult, categoriesResult] = await Promise.all([
    getCurrentUser(),
    getTemplates(),
    getCategories(Modes.NOTES),
  ]);

  const templates = templatesResult.success ? templatesResult.data || [] : [];
  const categories = categoriesResult.success ? categoriesResult.data || [] : [];

  return (
    <BrowseLayout mode={Modes.NOTES} categories={categories} user={user}>
      <TemplatesPageClient templates={templates} />
    </BrowseLayout>
  );
}
