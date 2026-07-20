import { redirect, permanentRedirect } from "next/navigation";
import { getListById } from "@/app/_server/actions/checklist";
import { getCategories } from "@/app/_server/actions/category";
import { getCurrentUser, canAccessAllContent } from "@/app/_server/actions/users";
import { ChecklistClient } from "@/app/_components/FeatureComponents/Checklists/Parts/ChecklistClient";
import { Modes } from "@/app/_types/enums";
import type { Metadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { isUuid } from "@/app/_consts/identity";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { PermissionsProvider } from "@/app/_providers/PermissionsProvider";
import { MetadataProvider } from "@/app/_providers/MetadataProvider";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";

interface ChecklistPageProps {
  params: Promise<{
    uuid: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata(props: ChecklistPageProps): Promise<Metadata> {
  const params = await props.params;
  return getMedatadaTitle(Modes.CHECKLISTS, params.uuid);
}

export default async function ChecklistPage(props: ChecklistPageProps) {
  const params = await props.params;
  const { uuid } = params;

  if (!isUuid(uuid)) {
    const { legacyResolve } = await import("@/app/_server/lib/legacy-lookup");
    const resolved = await legacyResolve(
      Modes.CHECKLISTS,
      UNCATEGORIZED,
      decodeURIComponent(uuid),
    );

    if (resolved) {
      permanentRedirect(`/checklist/${resolved}`);
    }

    redirect("/");
  }

  const userRecord = await getCurrentUser();
  const username = userRecord?.username || "";
  const hasContentAccess = await canAccessAllContent();

  const categoriesResult = await getCategories(Modes.CHECKLISTS);

  let checklist = await getListById(uuid, username);

  if (!checklist && hasContentAccess) {
    checklist = await getListById(uuid);
  }

  if (!checklist) {
    redirect("/");
  }

  const categories =
    categoriesResult.success && categoriesResult.data
      ? categoriesResult.data
      : [];

  const metadata = {
    id: checklist.id,
    uuid: checklist.uuid,
    title: checklist.title,
    category: checklist.category || UNCATEGORIZED,
    owner: checklist.owner,
    createdAt: checklist.createdAt,
    updatedAt: checklist.updatedAt,
    type: "checklist" as const,
  };

  const user = sanitizeUserForClient(userRecord);

  return (
    <MetadataProvider metadata={metadata}>
      <PermissionsProvider item={checklist}>
        <ChecklistClient
          checklist={checklist}
          categories={categories}
          user={user}
        />
      </PermissionsProvider>
    </MetadataProvider>
  );
}
