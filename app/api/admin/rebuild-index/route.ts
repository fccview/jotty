import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getUserIndex } from "@/app/_server/actions/users/helpers";
import {
  rebuildOwnerRelations,
  rebuildRelations,
} from "@/app/_server/actions/relations/indexer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    if (!user.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    try {
      const { username } = await request.json().catch(() => ({}));

      if (!username) {
        await rebuildRelations();
        return NextResponse.json({
          success: true,
          message: "Successfully rebuilt link index for every user",
        });
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
