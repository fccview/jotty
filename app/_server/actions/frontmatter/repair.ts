"use server";

import path from "path";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { Result } from "@/app/_types";
import type { ItemType } from "@/app/_types/core";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";
import { modeFor } from "@/app/_utils/sharing-utils";
import { getCurrentUser, canAccessAllContent } from "@/app/_server/actions/users";
import { serverReadExisting, serverWriteFile } from "@/app/_server/actions/file";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { isPathUuid, isWritable } from "@/app/_server/actions/lib/read-only";
import { readOnlyNotice } from "@/app/_server/actions/lib/read-only-message";
import { lockOfContent } from "@/app/_server/actions/lib/unstamped";
import { repairFrontmatter } from "@/app/_server/actions/lib/frontmatter-repair";
import { canReachFile } from "@/app/_server/actions/share/access";
import { reachableFile } from "@/app/_server/actions/share/queries";
import { logAudit } from "@/app/_server/actions/log";
import { broadcast } from "@/app/_server/actions/ws/broadcast";

interface Fixed {
  uuid: string;
}

const _refuse = async (key: string): Promise<Result<Fixed>> => {
  const t = await getTranslations("errors");
  return { success: false, error: t(key) };
};

const _mayEdit = async (itemType: ItemType, filePath: string, username: string) =>
  (await canAccessAllContent()) ||
  canReachFile(modeFor(itemType), filePath, username, PermissionTypes.EDIT);

const _repair = async (
  itemType: ItemType,
  uuid: string,
  filePath: string,
  username: string,
): Promise<Result<Fixed>> => {
  const content = await serverReadExisting(filePath);
  if (content === null) return _refuse("notFound");
  if (!lockOfContent(content, filePath)) return { success: true, data: { uuid } };

  const repaired = repairFrontmatter(content, uuid);
  if (!repaired) return _refuse("frontmatterUnfixable");

  await serverWriteFile(filePath, repaired);
  await logAudit({
    level: "INFO",
    action: "frontmatter_repaired",
    category: itemType === ItemTypes.CHECKLIST ? "checklist" : "note",
    success: true,
    resourceId: uuid,
    resourceType: itemType,
  });
  await broadcast({
    type: itemType === ItemTypes.CHECKLIST ? "checklist" : "note",
    action: "updated",
    entityId: uuid,
    username,
  });
  return { success: true, data: { uuid } };
};

export const fixFrontmatter = async (uuid: string, itemType: ItemType): Promise<Result<Fixed>> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) return _refuse("requiredPermissions");
    if (!isPathUuid(uuid)) return _refuse("frontmatterNothingToFix");

    const filePath = await reachableFile(uuid, itemType, user.username, PermissionTypes.READ);
    if (!filePath || !(await _mayEdit(itemType, filePath, user.username))) {
      return _refuse("requiredPermissions");
    }
    if (!(await isWritable(path.dirname(filePath)))) {
      return { success: false, error: await readOnlyNotice() };
    }

    const result = await runQueued(itemLane(modeFor(itemType), uuid), () =>
      _repair(itemType, uuid, filePath, user.username),
    );

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn("Cache revalidation failed, but the frontmatter was fixed:", error);
    }
    return result;
  } catch (error) {
    console.error("fixFrontmatter failed:", error);
    return _refuse("frontmatterUnfixable");
  }
};
