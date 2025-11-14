import { getUserByUsername } from "@/app/_server/actions/users";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;

    const user = await getUserByUsername(username);
    const avatarUrl = user?.avatarUrl || "";

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error("Error fetching avatar url for", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
