import { Checklist } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
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

    const { checklist, hasChanges } = await checkAndRefreshRecurringItems(stored);
    if (!hasChanges) return list;

    await broadcast({ type: "checklist", action: "updated", entityId: list.uuid!, username: list.owner! });
    return { ...list, items: checklist.items, updatedAt: checklist.updatedAt };
  });
};
