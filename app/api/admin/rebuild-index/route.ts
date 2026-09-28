import { NextResponse } from "next/server";
import { getUserIndex } from "@/app/_server/actions/users/helpers";
import { rebuildOwnerRelations } from "@/app/_server/actions/relations/indexer";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { rebuildIndexBody, rebuiltSchema } from "@/app/_schemas/api/admin";

export const dynamic = "force-dynamic";

const NOT_REBUILT = "Failed to rebuild link index";

export const POST = defineRoute(
  {
    id: "rebuildLinkIndex",
    method: HttpMethod.POST,
    path: "/admin/rebuild-index",
    tag: ApiTag.ADMIN,
    summary: "Rebuild the link index",
    description: "Rebuilds one user's links and backlinks from their files. Anybody can rebuild their own. Only admins can name somebody else. The body is optional.",
    body: rebuildIndexBody,
    responses: {
      200: { description: "Rebuilt", schema: rebuiltSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ user, body }) => {
    const username = body.username || user.username;

    if (username !== user.username && !user.isAdmin) {
      return refuse("Admin access required", 403);
    }

    if ((await getUserIndex(username)) === -1) return refuse("User not found", 404);

    try {
      await rebuildOwnerRelations(username);
    } catch (error) {
      console.error("Failed to rebuild link index:", error);
      return refuse(NOT_REBUILT, 500);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully rebuilt link index for ${username}`,
    });
  },
);
