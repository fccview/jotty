import fs from "fs/promises";
import type { FileItem, Result } from "@/app/_types";
import { AttachmentErrors } from "@/app/_consts/attachments";
import { MAX_FILE_SIZE } from "@/app/_consts/files";
import { getSettings } from "@/app/_server/actions/config";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { PermissionTypes } from "@/app/_types/enums";
import { AttachedItem, locateItem, mayDo, mayView } from "./access";
import { describeFile, fileOf, removeFile, storeUpload } from "./store";

export type Gate = { item: AttachedItem; username: string } | { error: AttachmentErrors };

export const refusal = <T>(error: AttachmentErrors): Result<T> => ({ success: false, error });

export const sizeCap = async (): Promise<number> =>
  (await getSettings())?.maximumFileSize || MAX_FILE_SIZE;

export const admit = async (
  username: string | undefined,
  itemUuid: string,
  wanted: PermissionTypes,
): Promise<Gate> => {
  if (!username) return { error: AttachmentErrors.UNAUTHENTICATED };

  const item = await locateItem(itemUuid);
  if (!item) return { error: AttachmentErrors.NOT_FOUND };

  if (await mayDo(item, username, wanted)) return { item, username };

  const seesIt = wanted !== PermissionTypes.READ && (await mayView(item, username));
  return { error: seesIt ? AttachmentErrors.DENIED : AttachmentErrors.NOT_FOUND };
};

export const announce = (itemUuid: string, username: string, action: "updated" | "deleted" = "updated") =>
  broadcast({ type: "attachments", action, entityId: itemUuid.toLowerCase(), username });

export const describeStored = async (itemUuid: string, name: string): Promise<FileItem> => {
  const filePath = fileOf(itemUuid, name);
  if (!filePath) throw new Error(`Unaddressable attachment ${itemUuid}/${name}`);
  return describeFile(itemUuid, name, await fs.lstat(filePath));
};

export const uploadAs = async (
  username: string | undefined,
  itemUuid: string,
  file: unknown,
): Promise<Result<FileItem>> => {
  try {
    const gate = await admit(username, itemUuid, PermissionTypes.EDIT);
    if ("error" in gate) return refusal(gate.error);

    if (!(file instanceof File)) return refusal(AttachmentErrors.NO_FILE);

    if (file.size > (await sizeCap())) {
      return refusal(AttachmentErrors.TOO_LARGE);
    }

    const name = await storeUpload(
      gate.item.uuid,
      file.name,
      Buffer.from(await file.arrayBuffer()),
    );
    await announce(gate.item.uuid, gate.username);

    return { success: true, data: await describeStored(gate.item.uuid, name) };
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return refusal(AttachmentErrors.FAILED);
  }
};

export const deleteAs = async (
  username: string | undefined,
  itemUuid: string,
  name: string,
): Promise<Result<null>> => {
  try {
    const gate = await admit(username, itemUuid, PermissionTypes.DELETE);
    if ("error" in gate) return refusal(gate.error);

    if (!fileOf(gate.item.uuid, name)) return refusal(AttachmentErrors.BAD_NAME);

    if (!(await removeFile(gate.item.uuid, name))) return refusal(AttachmentErrors.NOT_FOUND);
    await announce(gate.item.uuid, gate.username, "deleted");
    return { success: true, data: null };
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return refusal(AttachmentErrors.FAILED);
  }
};
