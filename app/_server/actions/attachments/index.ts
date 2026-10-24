"use server";

import path from "path";
import fs from "fs/promises";
import { Result } from "@/app/_types";
import type { FileItem } from "@/app/_types";
import { AttachmentErrors } from "@/app/_consts/attachments";
import { MAX_FILE_SIZE } from "@/app/_consts/files";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getSettings } from "@/app/_server/actions/config";
import { PermissionTypes } from "@/app/_types/enums";
import { AttachedItem, locateItem, mayDo } from "./access";
import { adoptUrls } from "./adopt";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import {
  adoptFile,
  describeFile,
  fileOf,
  listFolder,
  removeFile,
  storeUpload,
} from "./store";

type Gate = { item: AttachedItem; username: string } | { error: AttachmentErrors };

const _refuse = <T>(error: AttachmentErrors): Result<T> => ({ success: false, error });

const _gate = async (itemUuid: string, wanted: PermissionTypes): Promise<Gate> => {
  const user = await getCurrentUser();
  if (!user?.username) return { error: AttachmentErrors.UNAUTHENTICATED };

  const item = await locateItem(itemUuid);
  if (!item) return { error: AttachmentErrors.NOT_FOUND };

  return (await mayDo(item, user.username, wanted)) ? { item, username: user.username } : { error: AttachmentErrors.DENIED };
};

const _announce = (itemUuid: string, username: string, action: "updated" | "deleted" = "updated") =>
  broadcast({ type: "attachments", action, entityId: itemUuid.toLowerCase(), username });

const _describe = async (itemUuid: string, name: string): Promise<FileItem> => {
  const filePath = fileOf(itemUuid, name);
  if (!filePath) throw new Error(`Unaddressable attachment ${itemUuid}/${name}`);
  return describeFile(itemUuid, name, await fs.lstat(filePath));
};

export const uploadFile = async (formData: FormData): Promise<Result<FileItem>> => {
  try {
    const gate = await _gate(String(formData.get("itemUuid") || ""), PermissionTypes.EDIT);
    if ("error" in gate) return _refuse(gate.error);

    const file = formData.get("file");
    if (!(file instanceof File)) return _refuse(AttachmentErrors.NO_FILE);

    const settings = await getSettings();
    if (file.size > (settings?.maximumFileSize || MAX_FILE_SIZE)) {
      return _refuse(AttachmentErrors.TOO_LARGE);
    }

    const name = await storeUpload(
      gate.item.uuid,
      file.name,
      Buffer.from(await file.arrayBuffer()),
    );
    await _announce(gate.item.uuid, gate.username);

    return { success: true, data: await _describe(gate.item.uuid, name) };
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return _refuse(AttachmentErrors.FAILED);
  }
};

export const listAttachments = async (itemUuid: string): Promise<Result<FileItem[]>> => {
  try {
    const gate = await _gate(itemUuid, PermissionTypes.READ);
    if ("error" in gate) return _refuse(gate.error);

    return { success: true, data: await listFolder(gate.item.uuid) };
  } catch (error) {
    console.error("Error listing attachments:", error);
    return _refuse(AttachmentErrors.FAILED);
  }
};

export const deleteAttachment = async (
  itemUuid: string,
  name: string,
): Promise<Result<null>> => {
  try {
    if (!fileOf(itemUuid, name)) return _refuse(AttachmentErrors.BAD_NAME);

    const gate = await _gate(itemUuid, PermissionTypes.DELETE);
    if ("error" in gate) return _refuse(gate.error);

    if (!(await removeFile(gate.item.uuid, name))) return _refuse(AttachmentErrors.NOT_FOUND);
    await _announce(gate.item.uuid, gate.username, "deleted");
    return { success: true, data: null };
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return _refuse(AttachmentErrors.FAILED);
  }
};

export const attachTo = async (
  targetUuid: string,
  sourceUuid: string,
  name: string,
): Promise<Result<FileItem>> => {
  try {
    const source = fileOf(sourceUuid, name);
    if (!source) return _refuse(AttachmentErrors.BAD_NAME);

    const from = await _gate(sourceUuid, PermissionTypes.READ);
    if ("error" in from) return _refuse(from.error);

    const to = await _gate(targetUuid, PermissionTypes.EDIT);
    if ("error" in to) return _refuse(to.error);

    if (from.item.uuid === to.item.uuid) {
      return { success: true, data: await _describe(to.item.uuid, name) };
    }

    const stats = await fs.lstat(source).catch(() => null);
    if (!stats?.isFile()) return _refuse(AttachmentErrors.NOT_FOUND);

    const placed = await adoptFile(source, to.item.uuid, path.basename(source));
    if (!placed.reused) await _announce(to.item.uuid, to.username);
    return { success: true, data: await _describe(to.item.uuid, placed.name) };
  } catch (error) {
    console.error("Error attaching file:", error);
    return _refuse(AttachmentErrors.FAILED);
  }
};

export const adoptRefs = async (
  itemUuid: string,
  urls: string[],
): Promise<Result<Record<string, string>>> => {
  try {
    const gate = await _gate(itemUuid, PermissionTypes.EDIT);
    if ("error" in gate) return _refuse(gate.error);
    if (!Array.isArray(urls)) return _refuse(AttachmentErrors.BAD_NAME);

    const swapped = await adoptUrls(gate.item.uuid, gate.username, urls);
    if (Object.keys(swapped).length) await _announce(gate.item.uuid, gate.username);
    return { success: true, data: swapped };
  } catch (error) {
    console.error("Error adopting attachments:", error);
    return _refuse(AttachmentErrors.FAILED);
  }
};
