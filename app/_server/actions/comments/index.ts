"use server";

import { revalidatePath } from "next/cache";
import { Comment, Result } from "@/app/_types";
import {
  ItemTypes,
  PermissionTypes,
} from "@/app/_types/enums";
import { getListById } from "@/app/_server/actions/checklist";
import { canReach } from "@/app/_server/actions/share/queries";
import { getUsername, isAdmin } from "@/app/_server/actions/users";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import {
  readCommentsFile,
  writeCommentsFile,
} from "./store";

const _resolveOwner = async (
  uuid: string,
  permission: PermissionTypes,
): Promise<{ owner: string; username: string }> => {
  const username = await getUsername();
  if (!username) throw new Error("Not authenticated");

  const canAccess = await canReach(uuid, ItemTypes.CHECKLIST, username, permission);
  if (!canAccess) throw new Error("Permission denied");

  const checklist = await getListById(uuid, username);
  if (!checklist) throw new Error("Board not found");

  const owner = checklist.owner || username;
  return { owner, username };
};

const _newId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const _findComment = (
  comments: Comment[],
  commentId: string,
): Comment | undefined => comments.find((c) => c.id === commentId);

const _collectDescendantIds = (
  comments: Comment[],
  commentId: string,
): string[] => {
  const ids = [commentId];
  const children = comments.filter((c) => c.parentId === commentId);
  for (const child of children) {
    ids.push(..._collectDescendantIds(comments, child.id));
  }
  return ids;
};

export const getComments = async (
  uuid: string,
  itemId: string,
): Promise<Result<Comment[]>> => {
  try {
    const { owner } = await _resolveOwner(uuid, PermissionTypes.READ);
    const data = await readCommentsFile(owner, uuid);
    return { success: true, data: data.items[itemId] || [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load comments";
    return { success: false, error: message };
  }
};

export const addComment = async (
  formData: FormData,
): Promise<Result<Comment>> => {
  try {
    const uuid = formData.get("uuid") as string;
    const itemId = formData.get("itemId") as string;
    const text = (formData.get("text") as string)?.trim();
    const parentId = (formData.get("parentId") as string) || null;

    if (!uuid || !itemId) throw new Error("Missing board or item id");
    if (!text) throw new Error("Comment text cannot be empty");

    const { owner, username } = await _resolveOwner(uuid, PermissionTypes.EDIT);

    const comment: Comment = {
      id: _newId(),
      author: username,
      text,
      createdAt: new Date().toISOString(),
      parentId: parentId || null,
    };

    const data = await readCommentsFile(owner, uuid);
    const list = data.items[itemId] || [];
    list.push(comment);
    data.items[itemId] = list;

    await writeCommentsFile(owner, uuid, data);

    try {
      revalidatePath(`/checklist/${uuid}`);
    } catch (error) {
      console.warn("Cache revalidation failed, but comment was saved:", error);
    }

    await broadcast({
      type: "checklist",
      action: "updated",
      entityId: uuid,
      username,
    });

    return { success: true, data: comment };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add comment";
    return { success: false, error: message };
  }
};

export const editComment = async (
  formData: FormData,
): Promise<Result<Comment>> => {
  try {
    const uuid = formData.get("uuid") as string;
    const itemId = formData.get("itemId") as string;
    const commentId = formData.get("commentId") as string;
    const text = (formData.get("text") as string)?.trim();

    if (!uuid || !itemId || !commentId) throw new Error("Missing ids");
    if (!text) throw new Error("Comment text cannot be empty");

    const { owner, username } = await _resolveOwner(uuid, PermissionTypes.EDIT);
    const admin = await isAdmin();

    const data = await readCommentsFile(owner, uuid);
    const list = data.items[itemId] || [];
    const target = _findComment(list, commentId);

    if (!target) throw new Error("Comment not found");
    if (target.author !== username && !admin) throw new Error("Permission denied");

    target.text = text;
    target.updatedAt = new Date().toISOString();

    await writeCommentsFile(owner, uuid, data);

    try {
      revalidatePath(`/checklist/${uuid}`);
    } catch (error) {
      console.warn("Cache revalidation failed, but comment was saved:", error);
    }

    await broadcast({
      type: "checklist",
      action: "updated",
      entityId: uuid,
      username,
    });

    return { success: true, data: target };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to edit comment";
    return { success: false, error: message };
  }
};

export const deleteComment = async (
  formData: FormData,
): Promise<Result<null>> => {
  try {
    const uuid = formData.get("uuid") as string;
    const itemId = formData.get("itemId") as string;
    const commentId = formData.get("commentId") as string;

    if (!uuid || !itemId || !commentId) throw new Error("Missing ids");

    const { owner, username } = await _resolveOwner(uuid, PermissionTypes.EDIT);
    const admin = await isAdmin();

    const data = await readCommentsFile(owner, uuid);
    const list = data.items[itemId] || [];
    const target = _findComment(list, commentId);

    if (!target) throw new Error("Comment not found");
    if (target.author !== username && !admin) throw new Error("Permission denied");

    const removeIds = new Set(_collectDescendantIds(list, commentId));
    data.items[itemId] = list.filter((c) => !removeIds.has(c.id));

    await writeCommentsFile(owner, uuid, data);

    try {
      revalidatePath(`/checklist/${uuid}`);
    } catch (error) {
      console.warn("Cache revalidation failed, but comment was deleted:", error);
    }

    await broadcast({
      type: "checklist",
      action: "updated",
      entityId: uuid,
      username,
    });

    return { success: true, data: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete comment";
    return { success: false, error: message };
  }
};