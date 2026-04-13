import { redirect } from "next/navigation";
import { getListById } from "@/app/_server/actions/checklist";
import { getCategories } from "@/app/_server/actions/category";
import { getCurrentUser, canAccessAllContent } from "@/app/_server/actions/users";
import { ChecklistClient } from "@/app/_components/FeatureComponents/Checklists/Parts/ChecklistClient";
import { Modes } from "@/app/_types/enums";
import type { Metadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { decodeCategoryPath, decodeId } from "@/app/_utils/global-utils";
import { PermissionsProvider } from "@/app/_providers/PermissionsProvider";
import { MetadataProvider } from "@/app/_providers/MetadataProvider";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";

interface ChecklistPageProps {
  params: Promise<{
    user: string;
    uuid: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata(props: ChecklistPageProps): Promise<Metadata> {
  const params = await props.params;
  const { user, uuid } = params;
  return getMedatadaTitle(Modes.CHECKLISTS, decodeId(uuid), decodeURIComponent(user));
}

export default async function ChecklistPage(props: ChecklistPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { user: ownerUsername, uuid } = params;
  const id = decodeId(uuid);
  const owner = decodeURIComponent(ownerUsername);

  const categoryFallbackRaw = searchParams?.c;
  const categoryFallback = Array.isArray(categoryFallbackRaw) 
    ? categoryFallbackRaw[0] 
    : categoryFallbackRaw;

  const userRecord = await getCurrentUser();
  const username = userRecord?.username || "";
  const hasContentAccess = await canAccessAllContent();

  const categoriesResult = await getCategories(Modes.CHECKLISTS);

  let checklist = await getListById(id, owner, username, false, categoryFallback);

  if (!checklist && hasContentAccess) {
    checklist = await getListById(id, owner, undefined, false, categoryFallback);
  }

  if (!checklist) {
    redirect("/");
  }

  const categories =
    categoriesResult.success && categoriesResult.data
      ? categoriesResult.data
      : [];

  const metadata = {
    id: checklist.slug,
    uuid: checklist.uuid,
    title: checklist.title,
    category: checklist.category || "Uncategorized",
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
