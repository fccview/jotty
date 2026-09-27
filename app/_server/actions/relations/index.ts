"use server";

import { getCurrentUser, canAccessAllContent } from "@/app/_server/actions/users";
import { getSettings } from "@/app/_server/actions/config";
import { getUserIndex } from "@/app/_server/actions/users/helpers";
import { RelationsStatus } from "@/app/_consts/relations";
import type { Result } from "@/app/_types";
import type { BrainGraph, ItemRelations } from "@/app/_types/relations";
import { backlinksFor, graphFor, visibleItems } from "./queries";
import { rebuildOwnerRelations, rebuildRelations } from "./indexer";
import { relationsDb } from "./store";
import { getNoteById, updateNote } from "@/app/_server/actions/note";
import { canReach } from "@/app/_server/actions/share/queries";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";
import { itemHref } from "@/app/_utils/global-utils";
import { escapeLinkText } from "@/app/_utils/item-href-utils";
import { wrapMention } from "./tidy";

const EMPTY_RELATIONS: ItemRelations = { uuid: "", status: RelationsStatus.READY, backlinks: [], mentions: [], wikis: {} };

const _linksEnabled = async (): Promise<boolean> => {
  const settings = await getSettings();
  return settings?.editor?.enableBilateralLinks !== false;
};

const _ownerOf = (uuid: string): string | null => {
  const row = relationsDb()
    .prepare("SELECT owner FROM items WHERE uuid = ?")
    .get(uuid.toLowerCase()) as { owner?: string } | undefined;
  return row?.owner || null;
};

export const getItemRelations = async (uuid: string): Promise<ItemRelations> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username || !(await _linksEnabled())) return EMPTY_RELATIONS;

    const visible = await visibleItems(user.username);
    if (visible.has(uuid.toLowerCase())) return backlinksFor(uuid, visible);

    const owner = _ownerOf(uuid);
    if (!owner || !(await canAccessAllContent())) return EMPTY_RELATIONS;

    return backlinksFor(uuid, await visibleItems(owner));
  } catch (error) {
    console.error("getItemRelations failed:", error);
    return EMPTY_RELATIONS;
  }
};

export const getBrain = async (username?: string): Promise<Result<BrainGraph>> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) return { success: false, error: "Not authenticated" };
    if (!(await _linksEnabled())) return { success: false, error: "Not found" };

    const owner = username || user.username;
    if (owner !== user.username) {
      const peekable = (await canAccessAllContent()) && (await getUserIndex(owner)) !== -1;
      if (!peekable) return { success: false, error: "Not found" };
    }

    return { success: true, data: graphFor(owner, await visibleItems(owner)) };
  } catch (error) {
    console.error("getBrain failed:", error);
    return { success: false, error: "Failed to load relationships" };
  }
};

export const reindexRelations = async (username?: string): Promise<Result<number>> => {
  const user = await getCurrentUser();
  if (!user?.username) return { success: false, error: "Not authenticated" };
  if (!user.isAdmin) return { success: false, error: "Admins only" };

  try {
    if (!username) return { success: true, data: await rebuildRelations() };
    if ((await getUserIndex(username)) === -1) return { success: false, error: "User not found" };
    return { success: true, data: await rebuildOwnerRelations(username) };
  } catch (error) {
    console.error("reindexRelations failed:", error);
    return { success: false, error: "Failed to rebuild relationships" };
  }
};

const _itemRow = (uuid: string) =>
  relationsDb()
    .prepare("SELECT uuid, type, title FROM items WHERE uuid = ?")
    .get(uuid.toLowerCase()) as { uuid: string; type: ItemTypes; title: string } | undefined;

type Rewriter = (content: string, target: { title: string; href: string }) => string | null;

const _editLinking = async (
  sourceUuid: string,
  targetUuid: string,
  rewrite: Rewriter,
  label: string,
): Promise<Result<null>> => {
  const user = await getCurrentUser();
  if (!user?.username) return { success: false, error: "Not authenticated" };

  try {
    const allowed = await canReach(sourceUuid, ItemTypes.NOTE, user.username, PermissionTypes.EDIT);
    if (!allowed) return { success: false, error: "Permission denied" };

    const [note, target] = [await getNoteById(sourceUuid), _itemRow(targetUuid)];
    if (!note || !target) return { success: false, error: "Not found" };
    if (note.encrypted) return { success: false, error: "Encrypted notes stay closed" };

    const visible = await visibleItems(user.username);
    if (!visible.has(target.uuid)) return { success: false, error: "Not found" };

    const content = rewrite(note.content || "", {
      title: target.title,
      href: itemHref(target.type, target.uuid),
    });
    if (content === null) return { success: false, error: "Mention not found" };

    const formData = new FormData();
    formData.append("uuid", note.uuid || sourceUuid);
    formData.append("title", note.title);
    formData.append("category", "");
    formData.append("content", content);

    const result = await updateNote(formData);
    if (result && "error" in result && result.error) return { success: false, error: result.error };
    return { success: true, data: null };
  } catch (error) {
    console.error(`${label} failed:`, error);
    return { success: false, error: "Failed to connect items" };
  }
};

const _appendLink: Rewriter = (content, { title, href }) =>
  `${content.trimEnd()}\n\n[${escapeLinkText(title)}](${href})\n`;

const _wrapFirst: Rewriter = (content, { title, href }) => wrapMention(content, title, href);

export const connectItems = async (sourceUuid: string, targetUuid: string): Promise<Result<null>> =>
  _editLinking(sourceUuid, targetUuid, _appendLink, "connectItems");

export const linkMention = async (sourceUuid: string, targetUuid: string): Promise<Result<null>> =>
  _editLinking(sourceUuid, targetUuid, _wrapFirst, "linkMention");
