import path from "path";
import { Checklist } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { DATA_DIR } from "@/app/_consts/files";
import { grepFindFileByUuid } from "@/app/_utils/grep-utils";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { checkAndRefreshRecurringItems } from "@/app/_server/actions/checklist/parsers";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { shouldRefreshRecurringItem } from "@/app/_utils/recurrence-utils";

const _isDue = (list: Checklist) => list.items.some(shouldRefreshRecurringItem);

export const rollRecurring = async (list: Checklist): Promise<Checklist> => {
  if (!list.uuid || !_isDue(list)) return list;

  return runQueued(itemLane(Modes.CHECKLISTS, list.uuid), async () => {
    const stored = await getListById(list.uuid!, list.owner);
    if (!stored || !_isDue(stored)) return stored ? { ...list, items: stored.items } : list;

    const found = await grepFindFileByUuid(path.join(process.cwd(), DATA_DIR, Modes.CHECKLISTS), list.uuid!);
    if (!found) return { ...list, items: stored.items };

    const { checklist, hasChanges } = await checkAndRefreshRecurringItems(stored, found.filePath);
    if (!hasChanges) return list;

    await broadcast({ type: "checklist", action: "updated", entityId: list.uuid!, username: list.owner! });
    return { ...list, items: checklist.items, updatedAt: checklist.updatedAt };
  });
};
