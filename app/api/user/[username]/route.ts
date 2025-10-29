import { getUserByUsername } from "@/app/_server/actions/users";
import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  return withApiAuth(request, async (user) => {
    try {
      const { username } = params;

      const targetUser = await getUserByUsername(username);

      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const isOwnProfile = user.username === username;
      const isAdminUser = user.isAdmin;

      if (isOwnProfile || isAdminUser) {
        const { passwordHash, apiKey, ...safeUserData } = targetUser;
        return NextResponse.json({ user: safeUserData });
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
