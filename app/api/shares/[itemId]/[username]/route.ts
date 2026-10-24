import { NextResponse } from "next/server";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { itemSharesSchema, unshareParams } from "@/app/_schemas/api/relations";
import { grantsView, shareTarget } from "@/app/_server/actions/share/listing";
import {
  ITEM_MISSING,
  NOT_OWNER,
  UNSHARE_FAILED,
  revokeItem,
} from "@/app/_server/actions/share/grants";
import { modeFor } from "@/app/_utils/sharing-utils";

export const dynamic = "force-dynamic";

const STATUS: Record<string, number> = {
  [ITEM_MISSING]: 404,
  [NOT_OWNER]: 403,
  [UNSHARE_FAILED]: 500,
};

export const DELETE = defineRoute(
  {
    id: "unshareItem",
    method: HttpMethod.DELETE,
    path: "/shares/{itemId}/{username}",
    tag: ApiTag.SHARING,
    summary: "Stop sharing a note or checklist with someone",
    description:
      "Takes one person's access away, or turns the public link off with public. Removing somebody who doesn't hold it changes nothing. When the item is shared through its folder, everybody else keeps what they had and the item stops following the folder's shares.",
    params: unshareParams,
    responses: {
      200: { description: "Who holds the item now", schema: itemSharesSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ user, params }) => {
    const item = await shareTarget(user, params.itemId);
    if (!item) return refuse(ITEM_MISSING, 404);

    const result = await revokeItem(user, modeFor(item.type), item.uuid, params.username);
    if (!result.success || !result.data) {
      const error = result.error || UNSHARE_FAILED;
      return refuse(error, STATUS[error] ?? 400);
    }

    return NextResponse.json({ success: true, data: grantsView(item.uuid, item.type, result.data) });
  },
);
