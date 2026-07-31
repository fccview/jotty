import { redirect, permanentRedirect } from "next/navigation";
import { Modes } from "@/app/_types/enums";
import { legacyResolve } from "@/app/_server/actions/lib/legacy-lookup";
import { getCurrentUser } from "@/app/_server/actions/users";
import { decodeCategoryPath, decodeSegment } from "@/app/_utils/global-utils";

interface LegacyNotePageProps {
  params: Promise<{
    categoryPath: string[];
  }>;
}

export const dynamic = "force-dynamic";

/**
 * @deprecated Category+slug is not an identity anymore, uuid is. This route
 * only exists to 301 pre-uuid links onto /note/[uuid] and will be deleted a
 * release after note content has been migrated. Do not build anything new on
 * top of it.
 */
export default async function LegacyNotePage(props: LegacyNotePageProps) {
  const user = await getCurrentUser();

  if (!user?.username) {
    redirect("/");
  }

  const params = await props.params;
  const { categoryPath } = params;
  const id = decodeSegment(categoryPath[categoryPath.length - 1]);
  const category = decodeCategoryPath(categoryPath.slice(0, -1).join("/"));

  const uuid = await legacyResolve(Modes.NOTES, category, id, user.username);

  if (uuid) {
    permanentRedirect(`/note/${uuid}`);
  }

  redirect("/");
}
