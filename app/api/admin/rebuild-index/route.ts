import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { rebuildLinkIndex } from "@/app/_server/actions/link";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      const { username } = await request.json();

      if (!username) {
        return NextResponse.json(
          { error: "Username is required" },
          { status: 400 }
        );
      }

      await rebuildLinkIndex(username);

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
