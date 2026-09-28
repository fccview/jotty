import { NextResponse } from "next/server";
import { listUuid } from "@/app/_utils/api-utils";
import { LIST_NOT_FOUND } from "@/app/_utils/api-list-utils";
import { Rearranged, rearrangeItems } from "@/app/_server/actions/checklist-item/rearrange";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, okSchema } from "@/app/_schemas/api/common";
import { itemReorderBody, listParams } from "@/app/_schemas/api/checklists";

export const dynamic = "force-dynamic";

const REFUSALS: Partial<Record<Rearranged, () => Response>> = {
  [Rearranged.NO_LIST]: () => refuse(LIST_NOT_FOUND, 404),
  [Rearranged.NO_ITEM]: () => refuse("Item not found", 404),
  [Rearranged.FORBIDDEN]: () => refuse("Forbidden", 403),
};

export const PUT = defineRoute(
  {
    id: "reorderChecklistItems",
    method: HttpMethod.PUT,
    path: "/checklists/{listId}/items/reorder",
    tag: ApiTag.CHECKLIST_ITEMS,
    summary: "Move a checklist item",
    description:
      "Moves activeItemId next to overItemId, or inside it with isDropInto. Dropping an item onto itself or one of its descendants does nothing. Needs edit permission.",
    params: listParams,
    body: itemReorderBody,
    responses: {
      200: { description: "Moved, or nothing to do", schema: okSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: { description: "List or item not found", schema: ERRORS[404].schema },
      500: ERRORS[500],
    },
  },
  async ({ request, user, params, body }) => {
    const uuid = await listUuid(request, params.listId, user.username);
    if (!uuid) return refuse(LIST_NOT_FOUND, 404);

    const outcome = await rearrangeItems(user.username, { listUuid: uuid, ...body });
    return REFUSALS[outcome]?.() ?? NextResponse.json({ success: true });
  },
);
