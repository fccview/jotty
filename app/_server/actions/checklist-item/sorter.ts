import { ListPlan, ListRefusals, rewriteList, withItems } from "./rearrange";
import {
  preorderIds,
  restoreTree,
  sameOrder,
  sortLocale,
  sortTree,
  treeShape,
} from "@/app/_utils/checklist-sort-utils";
import { Checklist, Item, SanitisedUser } from "@/app/_types";
import { ItemSort, SortDirection, isKanbanType } from "@/app/_types/enums";

export const KANBAN_UNSORTABLE = "Only simple checklists can be sorted";

export enum Sorted {
  SORTED = "sorted",
  UNCHANGED = "unchanged",
  NO_LIST = "noList",
  FORBIDDEN = "forbidden",
  KANBAN = "kanban",
  STALE = "stale",
}

export type SortOutcome =
  | { status: Sorted.SORTED | Sorted.UNCHANGED; list: Checklist; before: string[] }
  | { status: Exclude<Sorted, Sorted.SORTED | Sorted.UNCHANGED> };

interface Arrangement {
  arrange: (items: Item[]) => Item[];
  expected?: string[];
}

const SORT_REFUSALS: ListRefusals<SortOutcome> = {
  missing: { status: Sorted.NO_LIST },
  forbidden: { status: Sorted.FORBIDDEN },
};

const _plan =
  ({ arrange, expected }: Arrangement) =>
  (list: Checklist): ListPlan<SortOutcome> => {
    if (isKanbanType(list.type)) return { outcome: { status: Sorted.KANBAN } };

    const items = list.items || [];
    const before = preorderIds(items);
    if (expected && !sameOrder(expected, treeShape(items))) return { outcome: { status: Sorted.STALE } };

    const arranged = arrange(items);
    if (sameOrder(before, preorderIds(arranged))) {
      return { outcome: { status: Sorted.UNCHANGED, list, before } };
    }

    const sorted = withItems(list, arranged);
    return { outcome: { status: Sorted.SORTED, list: sorted, before }, write: sorted };
  };

const _queued = (username: string, uuid: string, arrangement: Arrangement) =>
  rewriteList(username, uuid, SORT_REFUSALS, _plan(arrangement));

export const sortListItems = (
  actor: SanitisedUser,
  uuid: string,
  sort: ItemSort,
  direction?: SortDirection,
): Promise<SortOutcome> => {
  const locale = sortLocale(actor.preferredLocale || process.env.DEFAULT_LOCALE);
  return _queued(actor.username, uuid, {
    arrange: (items) => sortTree(items, sort, direction, locale),
  });
};

export const restoreListOrder = (
  actor: SanitisedUser,
  uuid: string,
  before: string[],
  expected: string[],
): Promise<SortOutcome> =>
  _queued(actor.username, uuid, {
    arrange: (items) => restoreTree(items, before),
    expected,
  });
