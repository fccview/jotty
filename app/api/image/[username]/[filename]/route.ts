import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getCurrentUser, canAccessAllContent } from "@/app/_server/actions/users";
import { NOTES_FOLDER } from "@/app/_consts/notes";
import { withCacheControl } from "@/app/_middleware/caching";
import { isEnvEnabled } from "@/app/_utils/env-utils";
import { hasSharedContentFrom } from "@/app/_server/actions/sharing";

export const dynamic = "force-dynamic";

export const GET = withCacheControl(async function GET(
  request: NextRequest,
  props: { params: Promise<{ username: string; filename: string }> },
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();

    if (!user && !isEnvEnabled(process.env.SERVE_PUBLIC_IMAGES)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { username } = params;
    const filename = decodeURIComponent(params.filename);

    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return new NextResponse("Invalid filename", { status: 400 });
    }

    if (user && username !== user.username) {
      const hasAdminAccess = await canAccessAllContent();
      const hasSharedAccess = await hasSharedContentFrom(username, user.username);

      if (!hasAdminAccess && !hasSharedAccess) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    const filePath = path.join(
      process.cwd(),
      "data",
      NOTES_FOLDER,
      username,
      "images",
      filename,
    );

    try {
      const fileBuffer = await fs.readFile(filePath);
      const ext = path.extname(filename).toLowerCase();

      let contentType = "image/jpeg";
      switch (ext) {
        case ".png":
          contentType = "image/png";
          break;
        case ".gif":
          contentType = "image/gif";
          break;
        case ".webp":
          contentType = "image/webp";
          break;
        case ".svg":
          contentType = "image/svg+xml";
          break;
        default:
          contentType = "image/jpeg";
      }

      return new NextResponse(fileBuffer as any, {
        headers: {
          "Content-Type": contentType,
        },
      });
    } catch (error) {
      return new NextResponse("Image not found", { status: 404 });
    }
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
});
