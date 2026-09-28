import { NextResponse } from "next/server";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { linkBody, linkedSchema, unlinkBody, unlinkedSchema } from "@/app/_schemas/api/relations";
import { MANAGED_WARNING } from "@/app/_consts/notes";
import {
  DENIED,
  LINK_MISSING,
  LINKS_OFF,
  NOT_VISIBLE,
  linkItems,
  unlinkItems,
} from "@/app/_server/actions/relations/explore";

export const dynamic = "force-dynamic";

const _statusOf = (error: string) => {
  if (error === NOT_VISIBLE || error === LINKS_OFF || error === LINK_MISSING) return 404;
  if (error === DENIED) return 403;
  return 400;
};

const _warned = (managed: boolean) => (managed ? { warning: MANAGED_WARNING } : {});

export const POST = defineRoute(
  {
    id: "connectItems",
    method: HttpMethod.POST,
    path: "/relations/links",
    tag: ApiTag.RELATIONS,
    summary: "Link a note to another item",
    description:
      "Writes a [Title](/note/uuid) link into the source note, so the link shows up in the note, in Referenced By and in the brain. Only link items that relate to each other. An item with no links is fine. Needs edit access to the source note. The rest of the note stays byte for byte. Encrypted notes are refused.",
    body: linkBody,
    responses: {
      200: { description: "Linked", schema: linkedSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ user, body }) => {
    const result = await linkItems(user, body.source, body.target, body.style);
    if (!result.success || !result.data) {
      return refuse(result.error || "Failed to connect items", _statusOf(result.error || ""));
    }
    return NextResponse.json({ success: true, ..._warned(result.data.managed) });
  },
);

export const DELETE = defineRoute(
  {
    id: "disconnectItems",
    method: HttpMethod.DELETE,
    path: "/relations/links",
    tag: ApiTag.RELATIONS,
    summary: "Remove a note's links to another item",
    description:
      "Takes every [Title](/note/uuid) and legacy [Title](/jotty/uuid) link to the target out of the source note. A link alone on its line goes with the line and the blank line beside it. A link inside a sentence becomes plain text. Everything else stays byte for byte, line endings included. It leaves [[wikilinks]] alone and counts them in wikiLinks. Needs edit access to the source note, and it refuses encrypted notes.",
    body: unlinkBody,
    responses: {
      200: { description: "Unlinked", schema: unlinkedSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ user, body }) => {
    const result = await unlinkItems(user, body.source, body.target);
    if (!result.success || !result.data) {
      return refuse(result.error || "Failed to disconnect items", _statusOf(result.error || ""));
    }
    const { removed, wikiLinks, managed } = result.data;
    return NextResponse.json({ success: true, removed, wikiLinks, ..._warned(managed) });
  },
);
