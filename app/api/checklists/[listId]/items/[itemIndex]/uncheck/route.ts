import { NextResponse } from "next/server";
import { PermissionTypes } from "@/app/_types/enums";
import { findListItem, isRefusal } from "@/app/_utils/api-list-utils";
import { editItem } from "@/app/_server/actions/checklist-item/editor";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, okSchema } from "@/app/_schemas/api/common";
import { listItemParams } from "@/app/_schemas/api/checklists";

export const dynamic = "force-dynamic";

export const PUT = defineRoute(
  {
    id: "uncheckChecklistItem",
    method: HttpMethod.PUT,
    path: "/checklists/{listId}/items/{itemIndex}/uncheck",
    tag: ApiTag.CHECKLIST_ITEMS,
    summary: "Uncheck a checklist item",
    description: "Marks the item and its sub-items as not done. Needs edit permission.",
    params: listItemParams,
    responses: {
      200: { description: "Done", schema: okSchema },
      400: { description: "Invalid or out of range item index", schema: ERRORS[400].schema },
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: { description: "Write failed", schema: ERRORS[500].schema },
    },
  },
  async ({ request, user, params }) => {
    const found = await findListItem(request, params.listId, params.itemIndex, user.username, PermissionTypes.EDIT);
    if (isRefusal(found)) return found.refusal;

    const formData = new FormData();
    formData.append("itemId", found.item.id);
    formData.append("completed", "false");

    const result = await editItem(user, found.list, formData, true);
    if (!result.success) {
      return refuse(result.error || "Failed to uncheck item", 500);
    }

    return NextResponse.json({ success: true });
  },
);
