import { redirect, permanentRedirect } from "next/navigation";
import { getListById } from "@/app/_server/actions/checklist";
import { isUuid } from "@/app/_consts/identity";
import { PublicChecklistView } from "@/app/_components/FeatureComponents/PublicView/PublicChecklistView";
import { CheckForNeedsMigration } from "@/app/_server/actions/note";
import { getCurrentUser, getUserByUsername } from "@/app/_server/actions/users";
import type { Metadata } from "next";
import { Modes } from "@/app/_types/enums";
import { getMedatadaTitle } from "@/app/_server/actions/config";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { isItemSharedWith } from "@/app/_server/actions/sharing";
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
  return getMedatadaTitle(Modes.CHECKLISTS, params.uuid);
}

export default async function PublicChecklistPage(
  props: PublicChecklistPageProps,
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { uuid } = params;

  await CheckForNeedsMigration();

  if (!isUuid(uuid)) {
    const { legacyResolve } = await import("@/app/_server/lib/legacy-lookup");
    const resolved = await legacyResolve(
      Modes.CHECKLISTS,
      UNCATEGORIZED,
      decodeURIComponent(uuid),
    );

    if (resolved) {
      permanentRedirect(`/public/checklist/${resolved}`);
    }

    redirect("/");
  }

  const checklist = await getListById(uuid);

  if (!checklist) {
    redirect("/");
  }

  const userRecord = await getUserByUsername(checklist.owner!);
  const user = sanitizeUserForPublic(
    userRecord,
    !!isEnvEnabled(process.env.SERVE_PUBLIC_IMAGES),
  );

  const isPubliclyShared = await isItemSharedWith(
    checklist.uuid!,
    "checklist",
    "public",
  );
  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.username === checklist.owner;
  const isPrintView = searchParams?.view_mode === "print";

  if (isPubliclyShared || isOwner || (isOwner && isPrintView)) {
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
