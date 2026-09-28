import { NextResponse } from "next/server";
import { turnAway } from "@/app/_utils/api-utils";
import { findList, indexPath, isRefusal, itemAt } from "@/app/_utils/api-list-utils";
import { addItem } from "@/app/_server/actions/checklist-item/editor";
import { graftItem } from "@/app/_server/actions/checklist-item/grafter";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { itemCreateBody, itemCreatedSchema, listParams } from "@/app/_schemas/api/checklists";
import { PermissionTypes } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

const NO_PARENT = "Parent item not found";

export const POST = defineRoute(
  {
    id: "createChecklistItem",
    method: HttpMethod.POST,
    path: "/checklists/{listId}/items",
    tag: ApiTag.CHECKLIST_ITEMS,
    summary: "Add an item to a checklist",
    description: "Adds a top-level item, or a sub-item when parentIndex is sent. Needs edit permission.",
    params: listParams,
    body: itemCreateBody,
    responses: {
      200: { description: "Item added", schema: itemCreatedSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: { description: "List or parent item not found", schema: ERRORS[404].schema },
      500: ERRORS[500],
    },
  },
  async ({ request, user, params, body }) => {
    const found = await findList(request, params.listId, user.username);
    if (isRefusal(found)) return found.refusal;
    const { list } = found;

    const refused = await turnAway(user.username, list.uuid!, PermissionTypes.EDIT);
    if (refused) return refused;

    if (body.parentIndex !== undefined) {
      const path = indexPath(body.parentIndex.toString());
      const parent = path ? itemAt(list.items, path) : undefined;
      if (!parent) return refuse(NO_PARENT, 404);

      const graft = new FormData();
      graft.append("uuid", list.uuid!);
      graft.append("parentId", parent.id);
      graft.append("text", body.text);

      const grafted = await graftItem(user, graft);
      if (!grafted.success) {
        return refuse(grafted.error || "Failed to add sub-item", 500);
      }

      return NextResponse.json({ success: true });
    }

    const formData = new FormData();
    formData.append("text", body.text);
    if (body.status) formData.append("status", body.status);
    if (body.time !== undefined) {
      formData.append("time", typeof body.time === "string" ? body.time : JSON.stringify(body.time));
    }

    const result = await addItem(user, list, formData, true);
    if (!result.success) {
      return refuse(result.error || "Failed to create item", 500);
    }

    return NextResponse.json({ success: true, data: { id: result.data?.id } });
  },
);
