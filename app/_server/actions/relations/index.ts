"use server";

import { getCurrentUser, canAccessAllContent } from "@/app/_server/actions/users";
import { getUserIndex } from "@/app/_server/actions/users/helpers";
import { LinkStyles, RelationsStatus } from "@/app/_consts/relations";
import type { Result, SanitisedUser } from "@/app/_types";
import type { BrainGraph, ItemRelations } from "@/app/_types/relations";
import { backlinksFor, graphFor, visibleItems } from "./queries";
import { rebuildOwnerRelations, rebuildRelations } from "./indexer";
import { relationsDb } from "./store";
import { linkItems, linksEnabled } from "./explore";

const EMPTY_RELATIONS: ItemRelations = { uuid: "", status: RelationsStatus.READY, backlinks: [], mentions: [], wikis: {} };

const _ownerOf = (uuid: string): string | null => {
  const row = relationsDb()
    .prepare("SELECT owner FROM items WHERE uuid = ?")
    .get(uuid.toLowerCase()) as { owner?: string } | undefined;
  return row?.owner || null;
};

export const getItemRelations = async (uuid: string): Promise<ItemRelations> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username || !(await linksEnabled())) return EMPTY_RELATIONS;

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
    if (!(await linksEnabled())) return { success: false, error: "Not found" };

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

const _asActor = async (
  work: (actor: SanitisedUser) => Promise<Result<null>>,
): Promise<Result<null>> => {
  const user = await getCurrentUser();
  if (!user?.username) return { success: false, error: "Not authenticated" };
  return work(user);
};

export const connectItems = async (sourceUuid: string, targetUuid: string): Promise<Result<null>> =>
  _asActor((actor) => linkItems(actor, sourceUuid, targetUuid, LinkStyles.APPEND));

export const linkMention = async (sourceUuid: string, targetUuid: string): Promise<Result<null>> =>
  _asActor((actor) => linkItems(actor, sourceUuid, targetUuid, LinkStyles.MENTION));
