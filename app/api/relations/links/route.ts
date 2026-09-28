import { NextResponse } from "next/server";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, okSchema } from "@/app/_schemas/api/common";
import { linkBody } from "@/app/_schemas/api/relations";
import { DENIED, LINKS_OFF, NOT_VISIBLE, linkItems } from "@/app/_server/actions/relations/explore";

export const dynamic = "force-dynamic";

const _statusOf = (error: string) => {
  if (error === NOT_VISIBLE || error === LINKS_OFF) return 404;
  if (error === DENIED) return 403;
  return 400;
};

export const POST = defineRoute(
  {
    id: "connectItems",
    method: HttpMethod.POST,
    path: "/relations/links",
    tag: ApiTag.RELATIONS,
    summary: "Link a note to another item",
    description:
      "Writes a [Title](/note/uuid) link into the source note, so the link shows up in the note, in Referenced By and in the brain. Needs edit access to the source note. Encrypted notes are refused.",
    body: linkBody,
    responses: {
      200: { description: "Linked", schema: okSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ user, body }) => {
    const result = await linkItems(user, body.source, body.target, body.style);
    if (!result.success) return refuse(result.error || "Failed to connect items", _statusOf(result.error || ""));
    return NextResponse.json({ success: true });
  },
);
