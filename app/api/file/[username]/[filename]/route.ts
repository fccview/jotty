import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/_server/actions/users";
import path from "path";
import fs from "fs/promises";
import { NOTES_FOLDER } from "@/app/_consts/notes";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string; filename: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user && !process.env.SERVE_PUBLIC_FILES) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { username } = params;
    const filename = decodeURIComponent(params.filename);

    const filePath = path.join(
      process.cwd(),
      "data",
      NOTES_FOLDER,
      username,
      "files",
      filename
    );

    try {
      const fileBuffer = await fs.readFile(filePath);
      const ext = path.extname(filename).toLowerCase();

      let contentType = "application/octet-stream";

      switch (ext) {
        case ".pdf":
          contentType = "application/pdf";
          break;
        case ".doc":
          contentType = "application/msword";
          break;
        case ".docx":
          contentType =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          break;
        case ".xls":
          contentType = "application/vnd.ms-excel";
          break;
        case ".xlsx":
          contentType =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          break;
        case ".ppt":
          contentType = "application/vnd.ms-powerpoint";
          break;
        case ".pptx":
          contentType =
            "application/vnd.openxmlformats-officedocument.presentationml.presentation";
          break;

        case ".txt":
          contentType = "text/plain";
          break;
        case ".csv":
          contentType = "text/csv";
          break;
        case ".json":
          contentType = "application/json";
          break;

        case ".zip":
          contentType = "application/zip";
          break;
        case ".rar":
          contentType = "application/x-rar-compressed";
          break;
        case ".7z":
          contentType = "application/x-7z-compressed";
          break;
        case ".tar":
          contentType = "application/x-tar";
          break;
        case ".gz":
          contentType = "application/gzip";
          break;

        case ".mp4":
          contentType = "video/mp4";
          break;
        case ".webm":
          contentType = "video/webm";
          break;
        case ".mov":
          contentType = "video/quicktime";
          break;

        case ".mp3":
          contentType = "audio/mpeg";
          break;
        case ".wav":
          contentType = "audio/wav";
          break;
        case ".ogg":
          contentType = "audio/ogg";
          break;

        case ".jpg":
        case ".jpeg":
          contentType = "image/jpeg";
          break;
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

        case ".iso":
          contentType = "application/x-iso9660-image";
          break;
        case ".dmg":
          contentType = "application/x-apple-diskimage";
          break;
      }

      return new NextResponse(fileBuffer as any, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control":
            "private, no-cache, no-store, max-age=0, must-revalidate",
          "Content-Disposition": `inline; filename="${filename}"`,
        },
      });
    } catch (error) {
      return new NextResponse("File not found", { status: 404 });
    }
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
