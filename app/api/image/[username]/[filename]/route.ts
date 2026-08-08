import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  getCurrentUser,
  canAccessAllContent,
} from "@/app/_server/actions/users";
import { NOTES_FOLDER } from "@/app/_consts/notes";
import { imageMime } from "@/app/_consts/files";
import { withCacheControl } from "@/app/_middleware/caching";
import { isEnvEnabled } from "@/app/_utils/env-utils";
import { sharedFrom } from "@/app/_server/actions/share/queries";
import { resolvePath } from "@/app/_utils/path-utils";

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

    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return new NextResponse("Invalid filename", { status: 400 });
    }

    if (user && username !== user.username) {
      const hasAdminAccess = await canAccessAllContent();
      const hasSharedAccess = await sharedFrom(
        username,
        user.username,
      );

      if (!hasAdminAccess && !hasSharedAccess) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    const baseDir = path.resolve(
      process.cwd(),
      "data",
      NOTES_FOLDER,
      username,
      "images",
    );
    const resolved = resolvePath(baseDir, filename);
    if (!resolved.ok) {
      return new NextResponse("Invalid filename", { status: 400 });
    }

    try {
      const fileBuffer = await fs.readFile(resolved.absolutePath);
      const contentType = imageMime(filename) || "image/jpeg";

      return new NextResponse(fileBuffer, {
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
