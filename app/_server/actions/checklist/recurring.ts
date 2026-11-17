import path from "path";
import { Checklist } from "@/app/_types";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { DATA_DIR } from "@/app/_consts/files";
import { grepFindFileByUuid } from "@/app/_utils/grep-utils";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { checkAndRefreshRecurringItems } from "@/app/_server/actions/checklist/parsers";
import { canReach } from "@/app/_server/actions/share/queries";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { hasDueRecurringItem, rollDueItems } from "@/app/_utils/recurrence-utils";

const _isDue = (list: Checklist) => hasDueRecurringItem(list.items);

const FILE_FIELDS = [
  "title",
  "type",
  "items",
  "statuses",
  "tags",
  "sharedWith",
  "specNote",
  "extraMetadata",
  "lockReason",
  "updatedAt",
] as const satisfies readonly (keyof Checklist)[];

const _rolledView = (list: Checklist): Checklist => ({ ...list, items: rollDueItems(list.items, list.statuses) });

const _fromFile = (list: Checklist, stored: Checklist): Checklist => ({
  ...list,
  ...Object.fromEntries(FILE_FIELDS.map((field) => [field, stored[field]])),
});

export const rollRecurring = async (list: Checklist, username: string): Promise<Checklist> => {
  if (!list.uuid || !_isDue(list)) return list;

  const mayWrite = await canReach(list.uuid, ItemTypes.CHECKLIST, username, PermissionTypes.EDIT);
  if (!mayWrite) return _rolledView(list);

  return runQueued(itemLane(Modes.CHECKLISTS, list.uuid), async () => {
    const stored = await getListById(list.uuid!, list.owner);
    if (!stored) return _rolledView(list);

    const latest = _fromFile(list, stored);
    if (!_isDue(stored)) return latest;
    if (stored.lockReason || !stored.owner) return _rolledView(latest);

    const ownerDir = path.join(process.cwd(), DATA_DIR, Modes.CHECKLISTS, stored.owner);
    const found = await grepFindFileByUuid(ownerDir, list.uuid!);
    if (!found) return _rolledView(latest);

    const { checklist, hasChanges } = await checkAndRefreshRecurringItems(stored, found.filePath);
    if (!hasChanges) return _rolledView(latest);

    await broadcast({ type: "checklist", action: "updated", entityId: list.uuid!, username: stored.owner });
    return _fromFile(list, checklist);
  });
};
