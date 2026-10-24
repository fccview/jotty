import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { AVATAR_VERSION_PARAM } from "@/app/_consts/attachments";
import { avatarFileOf } from "@/app/_server/actions/attachments/avatars";
import { CachePolicies, sendFile } from "@/app/_server/actions/attachments/serve";

export const dynamic = "force-dynamic";

export const GET = async (
  request: NextRequest,
  props: { params: Promise<{ userUuid: string }> },
) => {
  try {
    const { userUuid } = await props.params;
    const filePath = await avatarFileOf(userUuid);
    if (!filePath) return new NextResponse("Not found", { status: 404 });

    const versioned = request.nextUrl.searchParams.has(AVATAR_VERSION_PARAM);
    return await sendFile(
      request,
      filePath,
      path.basename(filePath),
      versioned ? CachePolicies.PUBLIC_FOREVER : CachePolicies.PUBLIC_BRIEF,
    );
  } catch (error) {
    console.error("Error serving avatar:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};
