"use server";

import path from "path";
import fs from "fs/promises";
import { Result } from "@/app/_types";
import type { FileItem } from "@/app/_types";
import { AttachmentErrors } from "@/app/_consts/attachments";
import { getCurrentUser } from "@/app/_server/actions/users";
import { PermissionTypes } from "@/app/_types/enums";
import { adoptUrls } from "./adopt";
import { adoptFile, fileOf, listFolder } from "./store";
import { admit, announce, deleteAs, describeStored, refusal, uploadAs } from "./write";

const _me = async (): Promise<string | undefined> => (await getCurrentUser())?.username;

const _gate = async (itemUuid: string, wanted: PermissionTypes) =>
  admit(await _me(), itemUuid, wanted);

export const uploadFile = async (formData: FormData): Promise<Result<FileItem>> =>
  uploadAs(await _me(), String(formData.get("itemUuid") || ""), formData.get("file"));

export const listAttachments = async (itemUuid: string): Promise<Result<FileItem[]>> => {
  try {
    const gate = await _gate(itemUuid, PermissionTypes.READ);
    if ("error" in gate) return refusal(gate.error);

    return { success: true, data: await listFolder(gate.item.uuid) };
  } catch (error) {
    console.error("Error listing attachments:", error);
    return refusal(AttachmentErrors.FAILED);
  }
};

export const deleteAttachment = async (
  itemUuid: string,
  name: string,
): Promise<Result<null>> => deleteAs(await _me(), itemUuid, name);

export const attachTo = async (
  targetUuid: string,
  sourceUuid: string,
  name: string,
): Promise<Result<FileItem>> => {
  try {
    const source = fileOf(sourceUuid, name);
    if (!source) return refusal(AttachmentErrors.BAD_NAME);

    const from = await _gate(sourceUuid, PermissionTypes.READ);
    if ("error" in from) return refusal(from.error);

    const to = await _gate(targetUuid, PermissionTypes.EDIT);
    if ("error" in to) return refusal(to.error);

    if (from.item.uuid === to.item.uuid) {
      return { success: true, data: await describeStored(to.item.uuid, name) };
    }

    const stats = await fs.lstat(source).catch(() => null);
    if (!stats?.isFile()) return refusal(AttachmentErrors.NOT_FOUND);

    const placed = await adoptFile(source, to.item.uuid, path.basename(source));
    if (!placed.reused) await announce(to.item.uuid, to.username);
    return { success: true, data: await describeStored(to.item.uuid, placed.name) };
  } catch (error) {
    console.error("Error attaching file:", error);
    return refusal(AttachmentErrors.FAILED);
  }
};

export const adoptRefs = async (
  itemUuid: string,
  urls: string[],
): Promise<Result<Record<string, string>>> => {
  try {
    const gate = await _gate(itemUuid, PermissionTypes.EDIT);
    if ("error" in gate) return refusal(gate.error);
    if (!Array.isArray(urls)) return refusal(AttachmentErrors.BAD_NAME);

    const swapped = await adoptUrls(gate.item.uuid, gate.username, urls);
    if (Object.keys(swapped).length) await announce(gate.item.uuid, gate.username);
    return { success: true, data: swapped };
  } catch (error) {
    console.error("Error adopting attachments:", error);
    return refusal(AttachmentErrors.FAILED);
  }
};
