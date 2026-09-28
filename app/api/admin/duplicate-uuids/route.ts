import { NextResponse } from "next/server";
import { getUserIndex } from "@/app/_server/actions/users/helpers";
import { adminPeek } from "@/app/_server/actions/lib/admin-peek";
import { findClashes } from "@/app/_server/actions/uuid-clash/scan";
import { NOT_CLAIMANT, NO_CLASH, repairClash } from "@/app/_server/actions/uuid-clash/repair";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import type { ApiUser } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import {
  clashListSchema,
  clashQuery,
  clashRepairBody,
  clashRepairSchema,
} from "@/app/_schemas/api/admin";

export const dynamic = "force-dynamic";

const ADMIN_ONLY = "Admin access with content permissions required";
const NO_USER = "User not found";

const _whose = async (user: ApiUser, username?: string): Promise<Response | string> => {
  const owner = username || user.username;
  if (owner !== user.username && !(await adminPeek(user))) return refuse(ADMIN_ONLY, 403);
  if ((await getUserIndex(owner)) === -1) return refuse(NO_USER, 404);
  return owner;
};

export const GET = defineRoute(
  {
    id: "listDuplicateUuids",
    method: HttpMethod.GET,
    path: "/admin/duplicate-uuids",
    tag: ApiTag.ADMIN,
    summary: "Find items that share a uuid",
    description:
      "Two files with the same uuid in their frontmatter, usually because a script copied one. The file with the oldest createdAt keeps the uuid, so every get, link and brain view opens that one, and the others stay hidden until you repair them. Anybody can check their own files. Naming somebody else needs an admin allowed to see other users' content.",
    query: clashQuery,
    responses: {
      200: { description: "Duplicated uuids and the files holding them", schema: clashListSchema },
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
    },
  },
  async ({ user, query }) => {
    const owner = await _whose(user, query.username);
    if (typeof owner !== "string") return owner;
    const duplicates = await findClashes(owner);
    return NextResponse.json({ duplicates, total: duplicates.length });
  },
);

export const POST = defineRoute(
  {
    id: "repairDuplicateUuid",
    method: HttpMethod.POST,
    path: "/admin/duplicate-uuids",
    tag: ApiTag.ADMIN,
    summary: "Give a duplicate a fresh uuid",
    description:
      "Gives the chosen file, or every file but the keeper, a new uuid, then points links at it when their text matches its title and not the keeper's. It leaves links that could mean either file alone and lists them in ambiguous. Anybody can repair their own files. Naming somebody else needs an admin allowed to see other users' content.",
    body: clashRepairBody,
    responses: {
      200: { description: "What changed", schema: clashRepairSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ user, body }) => {
    const owner = await _whose(user, body.username);
    if (typeof owner !== "string") return owner;

    try {
      const result = await repairClash(user, owner, body.uuid, body.path);
      if (!result.success || !result.data) {
        const error = result.error || NO_CLASH;
        return refuse(error, error === NO_CLASH || error === NOT_CLAIMANT ? 404 : 400);
      }
      return NextResponse.json({ success: true, ...result.data });
    } catch (error) {
      console.error("Duplicate uuid repair failed:", error);
      return refuse("Failed to repair the duplicate uuid", 500);
    }
  },
);
