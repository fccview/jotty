import { NextRequest, NextResponse } from "next/server";
import { listUuid } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { dropList, editList } from "@/app/_server/actions/checklist/editor";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope, okSchema } from "@/app/_schemas/api/common";
import { checklistSchema, checklistUpdateBody, listParams } from "@/app/_schemas/api/checklists";
import { ChecklistsTypes } from "@/app/_types/enums";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { toApiChecklist } from "@/app/_utils/api-checklist";

export const dynamic = "force-dynamic";

const NOT_FOUND = "Checklist not found";

const _visibleList = async (request: NextRequest, listId: string, username: string) => {
  const uuid = await listUuid(request, listId, username);
  return uuid ? getListById(uuid, username) : undefined;
};

export const GET = defineRoute(
  {
    id: "getChecklist",
    method: HttpMethod.GET,
    path: "/checklists/{listId}",
    tag: ApiTag.CHECKLISTS,
    summary: "Get a checklist",
    description: "One checklist with its items, including ones shared with the API key owner. Each item carries itemIndex, the tree index the item routes take.",
    params: listParams,
    responses: {
      200: { description: "The checklist", schema: envelope(checklistSchema) },
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params }) => {
    const list = await _visibleList(request, params.listId, user.username);
    if (!list) return refuse(NOT_FOUND, 404);

    return NextResponse.json({ success: true, data: toApiChecklist(list) });
  },
);

export const PUT = defineRoute(
  {
    id: "updateChecklist",
    method: HttpMethod.PUT,
    path: "/checklists/{listId}",
    tag: ApiTag.CHECKLISTS,
    summary: "Update a checklist",
    description: "Renames or moves a checklist. Fields left out keep their current value. Needs edit permission.",
    params: listParams,
    body: checklistUpdateBody,
    responses: {
      200: { description: "Updated checklist", schema: envelope(checklistSchema) },
      400: ERRORS[400],
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params, body }) => {
    const list = await _visibleList(request, params.listId, user.username);
    if (!list) return refuse(NOT_FOUND, 404);

    const formData = new FormData();
    formData.append("uuid", list.uuid!);
    formData.append("title", body.title ?? list.title);
    formData.append("category", body.category ?? list.category ?? UNCATEGORIZED);

    const result = await editList(user, formData);
    if (result.error) return refuse(result.error, 400);

    return NextResponse.json({
      success: true,
      data: {
        id: result.data?.uuid,
        title: result.data?.title,
        category: result.data?.category || UNCATEGORIZED,
        type: result.data?.type || ChecklistsTypes.SIMPLE,
        createdAt: result.data?.createdAt,
        updatedAt: result.data?.updatedAt,
      },
    });
  },
);

export const DELETE = defineRoute(
  {
    id: "deleteChecklist",
    method: HttpMethod.DELETE,
    path: "/checklists/{listId}",
    tag: ApiTag.CHECKLISTS,
    summary: "Delete a checklist",
    description: "Needs delete permission.",
    params: listParams,
    responses: {
      200: { description: "Deleted", schema: okSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params }) => {
    const list = await _visibleList(request, params.listId, user.username);
    if (!list) return refuse(NOT_FOUND, 404);

    const formData = new FormData();
    formData.append("uuid", list.uuid!);

    const result = await dropList(user, formData);
    if (result.error) return refuse(result.error, 400);

    return NextResponse.json({ success: true });
  },
);
