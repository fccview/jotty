import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getUserIndex } from "@/app/_server/actions/users/helpers";
import { rebuildOwnerRelations } from "@/app/_server/actions/relations/indexer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json().catch(() => ({}));
      const requested = typeof body?.username === "string" ? body.username.trim() : "";
      const username = requested || user.username;

      if (username !== user.username && !user.isAdmin) {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      }

      if ((await getUserIndex(username)) === -1) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      await rebuildOwnerRelations(username);

      return NextResponse.json({
        success: true,
        message: `Successfully rebuilt link index for ${username}`,
      });
    } catch (error) {
      console.error("Failed to rebuild link index:", error);
      return NextResponse.json(
        { error: "Failed to rebuild link index" },
        { status: 500 }
      );
    }
  });
}
