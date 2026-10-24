import { NextResponse } from "next/server";
import { findListItem, isRefusal } from "@/app/_utils/api-list-utils";
import { editItem } from "@/app/_server/actions/checklist-item/editor";
import { removeItem } from "@/app/_server/actions/checklist-item/remover";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, okSchema } from "@/app/_schemas/api/common";
import { itemUpdateBody, listItemParams } from "@/app/_schemas/api/checklists";
import { PermissionTypes } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

const _blankable = (value: string | number | null) => (value === null ? "" : String(value));

export const PATCH = defineRoute(
  {
    id: "updateChecklistItem",
    method: HttpMethod.PATCH,
    path: "/checklists/{listId}/items/{itemIndex}",
    tag: ApiTag.CHECKLIST_ITEMS,
    summary: "Update a checklist item",
    description:
      "Send at least one field. Fields left out keep their value, null clears every field except text. Needs edit permission.",
    params: listItemParams,
    body: itemUpdateBody,
    responses: {
      200: { description: "Updated", schema: okSchema },
      400: { description: "Invalid input or item index out of range", schema: ERRORS[400].schema },
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: { description: "Write failed", schema: ERRORS[500].schema },
    },
  },
  async ({ request, user, params, body }) => {
    const found = await findListItem(request, params.listId, params.itemIndex, user.username, PermissionTypes.EDIT);
    if (isRefusal(found)) return found.refusal;

    const formData = new FormData();
    formData.append("itemId", found.item.id);
    if (body.text !== undefined) formData.append("text", body.text);
    if (body.description !== undefined) formData.append("description", _blankable(body.description));
    if (body.priority !== undefined) formData.append("priority", _blankable(body.priority));
    if (body.score !== undefined) formData.append("score", _blankable(body.score));
    if (body.startDate !== undefined) formData.append("startDate", _blankable(body.startDate));
    if (body.targetDate !== undefined) formData.append("targetDate", _blankable(body.targetDate));
    if (body.estimatedTime !== undefined) formData.append("estimatedTime", _blankable(body.estimatedTime));

    const result = await editItem(user, found.list, formData, true);
    if (!result.success) {
      return refuse(result.error || "Failed to update item", 500);
    }

    return NextResponse.json({ success: true });
  },
);

export const DELETE = defineRoute(
  {
    id: "deleteChecklistItem",
    method: HttpMethod.DELETE,
    path: "/checklists/{listId}/items/{itemIndex}",
    tag: ApiTag.CHECKLIST_ITEMS,
    summary: "Delete a checklist item",
    description: "Removes the item and its sub-items. Needs delete permission.",
    params: listItemParams,
    responses: {
      200: { description: "Deleted", schema: okSchema },
      400: { description: "Invalid or out of range item index", schema: ERRORS[400].schema },
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params }) => {
    const found = await findListItem(request, params.listId, params.itemIndex, user.username, PermissionTypes.DELETE);
    if (isRefusal(found)) return found.refusal;

    const result = await removeItem(user, found.list.uuid!, found.item.id);
    if (!result.success) {
      return refuse(result.error || "Failed to delete item", 500);
    }

    return NextResponse.json({ success: true });
  },
);
