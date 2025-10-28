import { NextRequest, NextResponse } from "next/server";
import { withCacheControl } from "@/app/_middleware/caching";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export const GET = withCacheControl(async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    const filepath = path.join(
      process.cwd(),
      "data",
      "uploads",
      "app-icons",
      filename
    );

    try {
      const file = await fs.readFile(filepath);

      const ext = path.extname(filename).toLowerCase();
      let contentType = "application/octet-stream";

      switch (ext) {
        case ".png":
          contentType = "image/png";
          break;
        case ".jpg":
        case ".jpeg":
          contentType = "image/jpeg";
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
      }

      return new NextResponse(file as any, {
        headers: {
          "Content-Type": contentType,
        },
      });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error serving app icon:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
},
true);
