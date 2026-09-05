import { findUserRecord } from "@/app/_server/actions/users/records";
import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const { username } = params;

      const targetUser = await findUserRecord(username);

      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const isOwnProfile = user.username === username;
      const isAdminUser = user.isAdmin;

      if (isOwnProfile || isAdminUser) {
        return NextResponse.json({ user: sanitizeUserForClient(targetUser) });
      }

      return NextResponse.json({
        user: {
          username: targetUser.username,
          avatarUrl: targetUser.avatarUrl,
          preferredTheme: targetUser.preferredTheme,
        },
      });
    } catch (error) {
      console.error("Error fetching user info:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  });
}
