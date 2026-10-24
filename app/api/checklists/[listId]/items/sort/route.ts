import { NextResponse } from "next/server";
import { listUuid } from "@/app/_utils/api-utils";
import { LIST_NOT_FOUND } from "@/app/_utils/api-list-utils";
import { toApiChecklist } from "@/app/_utils/api-checklist";
import { KANBAN_UNSORTABLE, Sorted, sortListItems } from "@/app/_server/actions/checklist-item/sorter";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope } from "@/app/_schemas/api/common";
import { checklistSchema, itemSortBody, listParams } from "@/app/_schemas/api/checklists";

export const dynamic = "force-dynamic";

const SORT_FAILED = "Failed to sort items";

const REFUSALS: Partial<Record<Sorted, () => Response>> = {
  [Sorted.NO_LIST]: () => refuse(LIST_NOT_FOUND, 404),
  [Sorted.FORBIDDEN]: () => refuse("Forbidden", 403),
  [Sorted.KANBAN]: () => refuse(KANBAN_UNSORTABLE, 400),
};

export const PUT = defineRoute(
  {
    id: "sortChecklistItems",
    method: HttpMethod.PUT,
    path: "/checklists/{listId}/items/sort",
    tag: ApiTag.CHECKLIST_ITEMS,
    summary: "Sort checklist items",
    description:
      "alphabetical orders every level of the list by text, A to Z or Z to A with direction, using the caller's language. created and modified order by each item's timestamps, oldest first with asc and newest first with desc, and items without one go last. shuffle gives a new random order on every call. Sub-items stay under their parent. Simple checklists only. Needs edit permission.",
    params: listParams,
    body: itemSortBody,
    responses: {
      200: { description: "The sorted checklist", schema: envelope(checklistSchema) },
      400: { description: "Invalid input, or a kanban board", schema: ERRORS[400].schema },
      401: ERRORS[401],
      403: ERRORS[403],
      404: { description: "List not found", schema: ERRORS[404].schema },
      500: ERRORS[500],
    },
  },
  async ({ request, user, params, body }) => {
    const uuid = await listUuid(request, params.listId, user.username);
    if (!uuid) return refuse(LIST_NOT_FOUND, 404);

    const outcome = await sortListItems(user, uuid, body.sort, body.direction);
    const refusal = REFUSALS[outcome.status];
    if (refusal) return refusal();
    if (!("list" in outcome)) return refuse(SORT_FAILED, 500);

    return NextResponse.json({ success: true, data: toApiChecklist(outcome.list) });
  },
);
