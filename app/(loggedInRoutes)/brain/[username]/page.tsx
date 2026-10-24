import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BRAIN_FOCUS_PARAM } from "@/app/_consts/relations";
import { decodeSegment } from "@/app/_utils/global-utils";
import { BrainPage } from "@/app/_components/FeatureComponents/Brain/server/BrainPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("brain");
  return { title: t("title") };
}

export default async function UserBrainPage(props: {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  return (
    <BrainPage
      username={decodeSegment(params.username)}
      focus={searchParams[BRAIN_FOCUS_PARAM]}
    />
  );
}
