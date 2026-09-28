import { NextResponse } from "next/server";
import { findUserRecord } from "@/app/_server/actions/users/records";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { userLookupSchema, usernameParams } from "@/app/_schemas/api/users";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "getUser",
    method: HttpMethod.GET,
    path: "/user/{username}",
    tag: ApiTag.USERS,
    summary: "Get a user",
    description: "The full profile for yourself, or for anybody when you are an admin. Everybody else gets the public fields only.",
    params: usernameParams,
    responses: {
      200: { description: "The user", schema: userLookupSchema },
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ user, params }) => {
    const target = await findUserRecord(params.username);
    if (!target) return refuse("User not found", 404);

    if (user.username === params.username || user.isAdmin) {
      return NextResponse.json({ user: sanitizeUserForClient(target) });
    }

    return NextResponse.json({
      user: {
        username: target.username,
        avatarUrl: target.avatarUrl,
        preferredTheme: target.preferredTheme,
      },
    });
  },
);
