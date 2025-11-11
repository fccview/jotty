import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/app/_server/actions/api";

export const withApiAuth = async (
  request: NextRequest,
  handler: (user: any, request: NextRequest) => Promise<NextResponse>
) => {
  try {
    const apiKey = request.headers.get("x-api-key");
    const user = await authenticateApiKey(apiKey || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handler(user, request);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

