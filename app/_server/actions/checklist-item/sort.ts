"use server";

import { getTranslations } from "next-intl/server";
import { sessionActor } from "@/app/_server/actions/lib/actor";
import { failedWith } from "@/app/_server/actions/lib/read-only-message";
import { Result } from "@/app/_types";
import { itemSortBody } from "@/app/_schemas/api/checklists";
import { SortedList } from "@/app/_utils/checklist-sort-utils";
import { SortOutcome, Sorted, restoreListOrder, sortListItems } from "./sorter";

const INVALID_INPUT = "errors.invalidInput";

const UNAUTHORIZED = "errors.unauthorized";

const SORT_FAILED = "checklists.sortFailed";

const UNDO_FAILED = "checklists.undoSortFailed";

const REFUSALS: Partial<Record<Sorted, string>> = {
  [Sorted.NO_LIST]: "checklists.checklistNotFound",
  [Sorted.FORBIDDEN]: "errors.permissionDenied",
  [Sorted.KANBAN]: "checklists.sortKanban",
  [Sorted.STALE]: "checklists.sortStale",
};

const _isIds = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every((id) => typeof id === "string");

const _parseIds = (raw: FormDataEntryValue | null): string[] | null => {
  if (typeof raw !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return _isIds(parsed) ? parsed : null;
  } catch (error) {
    console.warn("Refused an unreadable item order:", error);
    return null;
  }
};

const _refused = async (key: string): Promise<Result<SortedList>> => {
  const t = await getTranslations();
  return { success: false, error: t(key) };
};

const _turnedAway = (reason: string): Promise<Result<SortedList>> => {
  console.warn("Refused a sort without a session:", reason);
  return _refused(UNAUTHORIZED);
};

const _settle = async (
  run: () => Promise<SortOutcome>,
  failure: string,
): Promise<Result<SortedList>> => {
  try {
    const outcome = await run();
    if (outcome.status !== Sorted.SORTED && outcome.status !== Sorted.UNCHANGED) {
      return await _refused(REFUSALS[outcome.status] ?? failure);
    }
    const { list, before } = outcome;
    return { success: true, data: { list, before, changed: outcome.status === Sorted.SORTED } };
  } catch (error) {
    console.error(`Sort action failed (${failure}):`, error);
    const t = await getTranslations();
    return { success: false, error: await failedWith(error, t(failure)) };
  }
};

export const sortItems = async (formData: FormData): Promise<Result<SortedList>> => {
  const actor = await sessionActor();
  if ("error" in actor) return _turnedAway(actor.error);

  const uuid = formData.get("uuid");
  const parsed = itemSortBody.safeParse({
    sort: formData.get("sort"),
    direction: formData.get("direction") || undefined,
  });

  if (typeof uuid !== "string" || !uuid || !parsed.success) {
    console.warn("Refused a sort with bad input:", { uuid, issues: parsed.error?.issues });
    return _refused(INVALID_INPUT);
  }

  const { sort, direction } = parsed.data;
  return _settle(() => sortListItems(actor, uuid, sort, direction), SORT_FAILED);
};

export const undoSort = async (formData: FormData): Promise<Result<SortedList>> => {
  const actor = await sessionActor();
  if ("error" in actor) return _turnedAway(actor.error);

  const uuid = formData.get("uuid");
  const before = _parseIds(formData.get("before"));
  const expected = _parseIds(formData.get("expected"));

  if (typeof uuid !== "string" || !uuid || !before || !expected || before.length !== expected.length) {
    console.warn("Refused an undo with bad input:", { uuid });
    return _refused(INVALID_INPUT);
  }

  return _settle(() => restoreListOrder(actor, uuid, before, expected), UNDO_FAILED);
};
