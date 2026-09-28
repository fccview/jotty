import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BRAIN_FOCUS_PARAM } from "@/app/_consts/relations";
import { BrainPage } from "@/app/_components/FeatureComponents/Brain/server/BrainPage";

export const dynamic = "force-dynamic";

/**
 * Return the localized Brain title for the browser tab.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("brain");
  return { title: t("title") };
}

/**
 * Render the current user's Brain with the optional focus query parameter.
 */
export default async function OwnBrainPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const searchParams = await props.searchParams;
  return <BrainPage focus={searchParams[BRAIN_FOCUS_PARAM]} />;
}
