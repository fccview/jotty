import { redirect, permanentRedirect } from "next/navigation";
import { Modes, ItemTypes } from "@/app/_types/enums";
import { publicResolve } from "@/app/_server/actions/lib/legacy-lookup";
import { decodeCategoryPath, decodeSegment } from "@/app/_utils/global-utils";

interface LegacyPublicChecklistProps {
  params: Promise<{
    categoryPath: string[];
  }>;
}

export const dynamic = "force-dynamic";

/**
 * @deprecated Category+slug is not an identity anymore, uuid is. This route
 * only exists to 301 pre-uuid public links onto /public/checklist/[uuid] and
 * will be deleted a release after note content has been migrated. It is
 * unauthenticated, so it must only ever confirm items that are actually public.
 */
export default async function LegacyPublicChecklist(
  props: LegacyPublicChecklistProps,
) {
  const params = await props.params;
  const { categoryPath } = params;
  const id = decodeSegment(categoryPath[categoryPath.length - 1]);
  const category = decodeCategoryPath(categoryPath.slice(0, -1).join("/"));

  const uuid = await publicResolve(
    Modes.CHECKLISTS,
    category,
    id,
    ItemTypes.CHECKLIST,
  );

  if (uuid) {
    permanentRedirect(`/public/checklist/${uuid}`);
  }

  redirect("/");
}
