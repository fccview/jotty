import { redirect } from "next/navigation";
import { getAllLists } from "@/app/_server/actions/checklist";
import { PublicChecklistView } from "@/app/_components/FeatureComponents/PublicView/PublicChecklistView";
import { CheckForNeedsMigration } from "@/app/_server/actions/note";
import { getCurrentUser, getUserByUsername } from "@/app/_server/actions/users";
import type { Metadata } from "next";
import { Modes } from "@/app/_types/enums";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { decodeId } from "@/app/_utils/global-utils";
import { isItemSharedWith } from "@/app/_server/actions/sharing";
import { ItemTypes } from "@/app/_types/enums";
import { MetadataProvider } from "@/app/_providers/MetadataProvider";
import { PermissionsProvider } from "@/app/_providers/PermissionsProvider";
import { sanitizeUserForPublic } from "@/app/_utils/user-sanitize-utils";
import { isEnvEnabled } from "@/app/_utils/env-utils";

interface PublicChecklistPageProps {
  params: Promise<{
    uuid: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PublicChecklistPageProps,
): Promise<Metadata> {
  const params = await props.params;
  const { uuid } = params;

  return getMedatadaTitle(Modes.CHECKLISTS, decodeId(uuid), "Uncategorized");
}

export default async function PublicChecklistPage(
  props: PublicChecklistPageProps,
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { uuid } = params;
  const id = decodeId(uuid);

  await CheckForNeedsMigration();

  let checklist = undefined;

  const listsResult = await getAllLists();
  if (listsResult.success && listsResult.data) {
    checklist = listsResult.data.find(
      (list) => list.uuid === id || list.slug === id,
    );
  }

  if (!checklist) {
    redirect("/");
  }

  const userRecord = await getUserByUsername(checklist.owner!);
  const user = sanitizeUserForPublic(
    userRecord,
    !!isEnvEnabled(process.env.SERVE_PUBLIC_IMAGES),
  );

  const isPubliclyShared = await isItemSharedWith(
    checklist.uuid || id,
    ItemTypes.CHECKLIST,
    "public",
  );
  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.username === checklist.owner;
  const isPrintView = searchParams?.view_mode === "print";

  if (isPubliclyShared || isOwner || (isOwner && isPrintView)) {
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

    return (
      <MetadataProvider metadata={metadata}>
        <PermissionsProvider item={checklist}>
          <PublicChecklistView checklist={checklist} user={user} />
        </PermissionsProvider>
      </MetadataProvider>
    );
  }

  redirect("/");
}
