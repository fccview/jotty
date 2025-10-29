import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      const { passwordHash, apiKey, ...safeUserData } = user;
      return NextResponse.json({ user: safeUserData });
    } catch (error) {
      console.error("Error fetching user info:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  });
}
