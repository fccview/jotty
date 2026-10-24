import { NextResponse } from "next/server";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { itemSharesSchema, shareBody, shareParams } from "@/app/_schemas/api/relations";
import { grantsView, shareTarget } from "@/app/_server/actions/share/listing";
import {
  ITEM_MISSING,
  NOT_OWNER,
  READ_ONLY,
  SHARE_FAILED,
  grantItem,
} from "@/app/_server/actions/share/grants";
import { modeFor, permsFromCode } from "@/app/_utils/sharing-utils";

export const dynamic = "force-dynamic";

const STATUS: Record<string, number> = {
  [ITEM_MISSING]: 404,
  [NOT_OWNER]: 403,
  [SHARE_FAILED]: 500,
};

export const PUT = defineRoute(
  {
    id: "shareItem",
    method: HttpMethod.PUT,
    path: "/shares/{itemId}",
    tag: ApiTag.SHARING,
    summary: "Share a note or checklist",
    description:
      "Gives one person access to an item you own, or replaces what they already had. They get a notification and see it under shared with me. public makes a read-only link anyone can open. Only the owner or an admin can share. Folder shares aren't covered here.",
    params: shareParams,
    body: shareBody,
    responses: {
      200: { description: "Who holds the item now", schema: itemSharesSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ user, params, body }) => {
    const item = await shareTarget(user, params.itemId);
    if (!item) return refuse(ITEM_MISSING, 404);

    const result = await grantItem(
      user,
      modeFor(item.type),
      item.uuid,
      body.username,
      permsFromCode(body.permission) ?? READ_ONLY,
    );
    if (!result.success || !result.data) {
      const error = result.error || SHARE_FAILED;
      return refuse(error, STATUS[error] ?? 400);
    }

    return NextResponse.json({ success: true, data: grantsView(item.uuid, item.type, result.data) });
  },
);
