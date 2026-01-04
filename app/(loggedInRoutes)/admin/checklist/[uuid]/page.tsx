import { redirect } from "next/navigation";
import {
  getListById,
  getUserChecklists,
} from "@/app/_server/actions/checklist";
import { getCategories } from "@/app/_server/actions/category";
import { getCurrentUser, canAccessAllContent } from "@/app/_server/actions/users";
import { ChecklistClient } from "@/app/_components/FeatureComponents/Checklists/Parts/ChecklistClient";
import { Modes } from "@/app/_types/enums";
import type { Metadata } from "next";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { PermissionsProvider } from "@/app/_providers/PermissionsProvider";
import { MetadataProvider } from "@/app/_providers/MetadataProvider";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";

interface AdminChecklistPageProps {
  params: {
    uuid: string;
  };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: AdminChecklistPageProps): Promise<Metadata> {
  const { uuid } = params;
  return getMedatadaTitle(Modes.CHECKLISTS, uuid, "Admin");
}

export default async function AdminChecklistPage({ params }: AdminChecklistPageProps) {
  const { uuid } = params;
  const userRecord = await getCurrentUser();
  const hasContentAccess = await canAccessAllContent();

  if (!hasContentAccess) {
    redirect("/");
  }

  const [listsResult, categoriesResult] = await Promise.all([
    getUserChecklists({ username: userRecord?.username }),
    getCategories(Modes.CHECKLISTS),
  ]);

  if (!listsResult.success || !listsResult.data) {
    redirect("/");
  }

  const checklist = await getListById(uuid);

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
