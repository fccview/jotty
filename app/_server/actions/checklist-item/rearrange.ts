import path from "path";
import { revalidatePath } from "next/cache";
import { ensureDir, serverWriteFile } from "@/app/_server/actions/file";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { canReach } from "@/app/_server/actions/share/queries";
import { diskPath } from "@/app/_server/actions/share/target";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { numberTree } from "@/app/_utils/checklist-sort-utils";
import { DropPosition, ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { Checklist, Item } from "@/app/_types";

export enum Rearranged {
  MOVED = "moved",
  UNCHANGED = "unchanged",
  NO_LIST = "noList",
  NO_ITEM = "noItem",
  FORBIDDEN = "forbidden",
}

export interface ItemMove {
  listUuid: string;
  activeItemId: string;
  overItemId: string;
  position: DropPosition;
  isDropInto: boolean;
}

type Located = { item: Item; siblings: Item[]; index: number };

const _findInTree = (items: Item[], id: string): Located | null => {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === id) return { item: items[i], siblings: items, index: i };
    const found = items[i].children ? _findInTree(items[i].children!, id) : null;
    if (found) return found;
  }
  return null;
};

const _isDescendant = (ancestorId: string, targetId: string, items: Item[]): boolean => {
  const walk = (item: Item): boolean =>
    (item.children || []).some((child) => child.id === targetId || walk(child));
  const ancestor = _findInTree(items, ancestorId);
  return ancestor ? walk(ancestor.item) : false;
};

const _move = (items: Item[], move: ItemMove): Rearranged => {
  if (move.activeItemId === move.overItemId) return Rearranged.UNCHANGED;
  if (_isDescendant(move.activeItemId, move.overItemId, items)) return Rearranged.UNCHANGED;

  const active = _findInTree(items, move.activeItemId);
  const over = _findInTree(items, move.overItemId);
  if (!active || !over) return Rearranged.NO_ITEM;

  active.siblings.splice(active.index, 1);

  if (move.isDropInto) {
    over.item.children = [...(over.item.children || []), active.item];
  } else {
    const landing = over.siblings.findIndex((item) => item.id === move.overItemId);
    over.siblings.splice(move.position === DropPosition.AFTER ? landing + 1 : landing, 0, active.item);
  }

  return Rearranged.MOVED;
};

export const announceList = async (list: Checklist, username: string) => {
  try {
    revalidatePath("/");
    revalidatePath(`/checklist/${list.uuid}`);
  } catch (error) {
    console.warn("Cache revalidation failed, but data was saved successfully:", error);
  }
  await broadcast({ type: "checklist", action: "updated", entityId: list.uuid, username });
};

export interface ListPlan<T> {
  outcome: T;
  write?: Checklist;
}

export interface ListRefusals<T> {
  missing: T;
  forbidden: T;
}

export const withItems = (list: Checklist, items: Item[]): Checklist => ({
  ...list,
  items,
  updatedAt: new Date().toISOString(),
});

export const rewriteList = <T>(
  username: string,
  uuid: string,
  refusals: ListRefusals<T>,
  plan: (list: Checklist) => ListPlan<T>,
): Promise<T> =>
  runQueued(itemLane(Modes.CHECKLISTS, uuid), async () => {
    const list = await getListById(uuid, username);
    if (!list) return refusals.missing;

    if (!(await canReach(list.uuid, ItemTypes.CHECKLIST, username, PermissionTypes.EDIT))) {
      return refusals.forbidden;
    }

    const { outcome, write } = plan(list);
    if (!write) return outcome;

    const filePath = await diskPath(Modes.CHECKLISTS, username, list);
    await ensureDir(path.dirname(filePath));
    await serverWriteFile(filePath, listToMarkdown(write));
    await announceList(list, username);

    return outcome;
  });

const MOVE_REFUSALS: ListRefusals<Rearranged> = {
  missing: Rearranged.NO_LIST,
  forbidden: Rearranged.FORBIDDEN,
};

export const rearrangeItems = (username: string, move: ItemMove): Promise<Rearranged> =>
  rewriteList(username, move.listUuid, MOVE_REFUSALS, (list) => {
    const items = numberTree(list.items || []);
    const outcome = _move(items, move);
    return outcome === Rearranged.MOVED ? { outcome, write: withItems(list, numberTree(items)) } : { outcome };
  });
