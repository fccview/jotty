import { redirect, permanentRedirect } from "next/navigation";
import { Modes } from "@/app/_types/enums";
import { legacyResolve } from "@/app/_server/lib/legacy-lookup";
import { decodeCategoryPath } from "@/app/_utils/global-utils";

interface LegacyChecklistPageProps {
  params: Promise<{
    categoryPath: string[];
  }>;
}

export const dynamic = "force-dynamic";

export default async function LegacyChecklistPage(
  props: LegacyChecklistPageProps,
) {
  const params = await props.params;
  const { categoryPath } = params;
  const id = decodeURIComponent(categoryPath[categoryPath.length - 1]);
  const category = decodeCategoryPath(categoryPath.slice(0, -1).join("/"));

  const uuid = await legacyResolve(Modes.CHECKLISTS, category, id);

  if (uuid) {
    permanentRedirect(`/checklist/${uuid}`);
  }

  redirect("/");
}
