import { NextResponse } from "next/server";
import { findUserRecord } from "@/app/_server/actions/users/records";
import { defineRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { currentUserSchema } from "@/app/_schemas/api/users";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "getCurrentUser",
    method: HttpMethod.GET,
    path: "/user",
    tag: ApiTag.USERS,
    summary: "Get the API key owner",
    description: "Your own profile and preferences. Password hash, API key and MFA secrets are never included.",
    responses: {
      200: { description: "Your profile", schema: currentUserSchema },
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user }) => {
    const record = await findUserRecord(user.username);
    return NextResponse.json({ user: { ...user, lastLogin: record?.lastLogin } });
  },
);
