import { NextRequest } from "next/server";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { refuse } from "@/app/_server/api/define-route";
import { listUuid, turnAway } from "@/app/_utils/api-utils";
import { Checklist, Item } from "@/app/_types";
import { PermissionTypes } from "@/app/_types/enums";

export const LIST_NOT_FOUND = "List not found";
export const INVALID_INDEX = "Invalid item index";
export const OUT_OF_RANGE = "Item index out of range";

type Found<T> = T | { refusal: Response };

export const isRefusal = <T extends object>(found: Found<T>): found is { refusal: Response } =>
  "refusal" in found;

export const indexPath = (raw: string): number[] | null => {
  const path = raw.split(".").map((part) => parseInt(part));
  return path.every((idx) => idx >= 0) ? path : null;
};

export const itemAt = (items: Item[], [head, ...rest]: number[]): Item | undefined => {
  const item = items[head];
  if (!item || rest.length === 0) return item;
  return itemAt(item.children || [], rest);
};

export const itemAtIndex = (items: Item[], raw: string): { item: Item; index: number } | null => {
  const path = indexPath(raw);
  const item = path ? itemAt(items, path) : undefined;
  return path && item ? { item, index: path[path.length - 1] } : null;
};

export const guard = async (
  username: string,
  list: Checklist,
  permission?: PermissionTypes,
): Promise<Response | null> =>
  permission ? turnAway(username, list.uuid, permission) : null;

export const findList = async (
  request: NextRequest,
  listId: string,
  username: string,
  permission?: PermissionTypes,
): Promise<Found<{ list: Checklist }>> => {
  const uuid = await listUuid(request, listId, username);
  const list = uuid ? await getListById(uuid, username) : undefined;
  if (!list) return { refusal: refuse(LIST_NOT_FOUND, 404) };
  const denied = await guard(username, list, permission);
  return denied ? { refusal: denied } : { list };
};

export const findListItem = async (
  request: NextRequest,
  listId: string,
  itemIndex: string,
  username: string,
  permission?: PermissionTypes,
): Promise<Found<{ list: Checklist; item: Item }>> => {
  const found = await findList(request, listId, username, permission);
  if (isRefusal(found)) return found;

  const path = indexPath(itemIndex);
  if (!path) return { refusal: refuse(INVALID_INDEX, 400) };

  const item = itemAt(found.list.items, path);
  if (!item) return { refusal: refuse(OUT_OF_RANGE, 400) };

  return { list: found.list, item };
};
