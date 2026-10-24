"use server";

import path from "path";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { Result } from "@/app/_types";
import type { ItemType } from "@/app/_types/core";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";
import { CHECKLISTS_DIR, NOTES_DIR } from "@/app/_consts/files";
import { codeFromPerms, modeFor, parseSharedWith } from "@/app/_utils/sharing-utils";
import { PUBLIC_USER, SHARED_WITH_KEY } from "@/app/_consts/sharing";
import { isEncrypted } from "@/app/_utils/encryption-utils";
import { titleOf } from "@/app/_utils/title-utils";
import { mergeTags } from "@/app/_utils/tag-utils";
import { grepFindFilesByField } from "@/app/_utils/grep-utils";
import {
  extractYamlMetadata,
  generateYamlFrontmatter,
  splitFrontmatter,
} from "@/app/_utils/yaml-metadata-utils";
import { getCurrentUser } from "@/app/_server/actions/users";
import { serverReadExisting, serverWriteFile } from "@/app/_server/actions/file";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { isWritable } from "@/app/_server/actions/lib/read-only";
import { readOnlyNotice } from "@/app/_server/actions/lib/read-only-message";
import { reachableFile } from "@/app/_server/actions/share/queries";
import { announceShare, tellReceiver } from "@/app/_server/actions/share/grants";
import { findUserRecord } from "@/app/_server/actions/users/records";
import { commitNote } from "@/app/_server/actions/history/repo";
import { logAudit } from "@/app/_server/actions/log";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { frontmatterYaml, parseCustom, shareCheck, withOwnerKeys } from "./fields";

interface Saved {
  uuid: string;
}

const _refuse = async <T>(key: string, values?: Record<string, string>): Promise<Result<T>> => {
  const t = await getTranslations("errors");
  return { success: false, error: t(key, values) };
};

const _kindOf = (itemType: ItemType) => (itemType === ItemTypes.CHECKLIST ? "checklist" : "note");

const _rootOf = (itemType: ItemType) =>
  path.join(process.cwd(), itemType === ItemTypes.CHECKLIST ? CHECKLISTS_DIR("") : NOTES_DIR(""));

const _isOwner = (filePath: string, itemType: ItemType, username: string) =>
  path.relative(_rootOf(itemType), filePath).split(path.sep)[0] === username;

const _uuidTaken = async (uuid: string) => {
  const found = await Promise.all(
    [ItemTypes.NOTE, ItemTypes.CHECKLIST].map((type) => grepFindFilesByField(_rootOf(type), "uuid", uuid)),
  );
  return found.some((files) => files.length > 0);
};

const _readOwned = async (filePath: string, uuid: string) => {
  const raw = await serverReadExisting(filePath);
  if (raw === null) return null;
  const { metadata } = extractYamlMetadata(raw);
  return metadata.uuid === uuid ? { raw, metadata } : null;
};

const _commit = (filePath: string, raw: string, metadata: Record<string, unknown>) => {
  const [owner, ...rest] = path.relative(_rootOf(ItemTypes.NOTE), filePath).split(path.sep);
  const { body } = splitFrontmatter(raw);
  if (!owner || metadata.encrypted === true || isEncrypted(body)) return;

  commitNote(owner, rest.join(path.sep), "update", titleOf(metadata, body, path.basename(filePath, ".md"))).catch(
    (error) => console.warn("Note history commit failed after a frontmatter edit:", error),
  );
};

const _keepBodyTags = (fields: Record<string, unknown>, itemType: ItemType, body: string) => {
  if (itemType !== ItemTypes.NOTE) return fields;
  const tags = mergeTags(fields.tags, "", body);
  if (tags.length) return { ...fields, tags };
  const { tags: _old, ...rest } = fields;
  return rest;
};

const _sameValue = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const _shareRefusal = async (value: unknown, owner: string): Promise<Result<Saved> | null> => {
  const check = shareCheck(value);
  if ("error" in check) return _refuse(check.error);
  for (const user of check.users) {
    if (user === PUBLIC_USER) continue;
    if (user === owner) return _refuse("frontmatterShareSelf");
    if (!(await findUserRecord(user))) return _refuse("frontmatterShareUnknown", { user });
  }
  return null;
};

const _grantsOf = (value: unknown) => parseSharedWith(value)?.users ?? {};

const _reshare = async (itemType: ItemType, uuid: string, owner: string, before: unknown, after: unknown) => {
  const mode = modeFor(itemType);
  const was = _grantsOf(before);
  const now = _grantsOf(after);
  const users = Array.from(new Set([...Object.keys(was), ...Object.keys(now)]));
  const codeOf = (grants: typeof was, user: string) => (grants[user] ? codeFromPerms(grants[user]) : null);

  for (const receiver of users.filter((user) => codeOf(was, user) !== codeOf(now, user))) {
    const permissions = now[receiver];
    await logAudit({
      level: "INFO",
      action: permissions ? "item_shared" : "item_unshared",
      category: "sharing",
      success: true,
      resourceType: itemType,
      resourceId: uuid,
      metadata: permissions ? { receiver, permissions } : { receiver, wasInherited: false },
    });
    if (permissions && !was[receiver]) await tellReceiver(mode, uuid, owner, receiver);
  }
  await announceShare(mode, uuid, [owner, ...users]);
};

export const readFrontmatter = async (uuid: string, itemType: ItemType): Promise<Result<string>> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) return _refuse("requiredPermissions");

    const filePath = await reachableFile(uuid, itemType, user.username, PermissionTypes.READ);
    if (!filePath) return _refuse("requiredPermissions");

    const owned = await _readOwned(filePath, uuid);
    if (!owned) return _refuse("frontmatterUnreadable");

    return { success: true, data: frontmatterYaml(owned.metadata, _isOwner(filePath, itemType, user.username)) };
  } catch (error) {
    console.error("readFrontmatter failed:", error);
    return _refuse("frontmatterUnreadable");
  }
};

const _save = async (
  itemType: ItemType,
  uuid: string,
  filePath: string,
  parsed: Record<string, unknown>,
  username: string,
): Promise<Result<Saved>> => {
  const owned = await _readOwned(filePath, uuid);
  if (!owned) return _refuse("frontmatterUnreadable");

  const isOwner = _isOwner(filePath, itemType, username);
  const fields = withOwnerKeys(owned.metadata, parsed, isOwner);
  const nextUuid = fields.uuid as string;
  if (nextUuid !== uuid && (await _uuidTaken(nextUuid))) return _refuse("frontmatterUuidTaken");

  const sharesBefore = owned.metadata[SHARED_WITH_KEY];
  const sharesMoved = isOwner && !_sameValue(sharesBefore, fields[SHARED_WITH_KEY]);
  const refusal = sharesMoved ? await _shareRefusal(fields[SHARED_WITH_KEY], username) : null;
  if (refusal) return refusal;

  const { body } = splitFrontmatter(owned.raw);
  const before = generateYamlFrontmatter(owned.metadata);
  const after = generateYamlFrontmatter(_keepBodyTags(fields, itemType, body));
  if (!after) return _refuse("frontmatterSaveFailed");
  if (after === before) return { success: true, data: { uuid } };

  const next = after + body;
  await serverWriteFile(filePath, next);

  if (itemType === ItemTypes.NOTE) _commit(filePath, next, fields);

  await logAudit({
    level: "INFO",
    action: "frontmatter_edited",
    category: _kindOf(itemType),
    success: true,
    resourceId: nextUuid,
    resourceType: itemType,
  });
  await broadcast({ type: _kindOf(itemType), action: "updated", entityId: nextUuid, username });
  if (sharesMoved || nextUuid !== uuid) {
    await _reshare(itemType, nextUuid, username, sharesBefore, fields[SHARED_WITH_KEY]);
  }
  return { success: true, data: { uuid: nextUuid } };
};

export const saveFrontmatter = async (
  uuid: string,
  itemType: ItemType,
  text: string,
): Promise<Result<Saved>> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) return _refuse("requiredPermissions");

    const filePath = await reachableFile(uuid, itemType, user.username, PermissionTypes.EDIT);
    if (!filePath) return _refuse("requiredPermissions");
    if (!(await isWritable(path.dirname(filePath)))) {
      return { success: false, error: await readOnlyNotice() };
    }

    const parsed = parseCustom(typeof text === "string" ? text : "", _isOwner(filePath, itemType, user.username));
    if ("error" in parsed) return _refuse(parsed.error);

    const result = await runQueued(itemLane(modeFor(itemType), uuid), () =>
      _save(itemType, uuid, filePath, parsed.fields, user.username),
    );

    if (!result.success) return result;
    try {
      revalidatePath("/");
    } catch (error) {
      console.warn("Cache revalidation failed, but the frontmatter was saved:", error);
    }
    return result;
  } catch (error) {
    console.error("saveFrontmatter failed:", error);
    return _refuse("frontmatterSaveFailed");
  }
};
