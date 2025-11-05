import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { EXPORT_TEMP_DIR } from "@/app/_consts/files";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;
  const filePath = path.join(process.cwd(), EXPORT_TEMP_DIR, filename);

  try {
    const fileBuffer = await fs.readFile(filePath);
    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    await fs.unlink(filePath);
    try {
      const filesInDir = await fs.readdir(
        path.join(process.cwd(), EXPORT_TEMP_DIR)
      );
      if (filesInDir.length === 0) {
        await fs.rmdir(path.join(process.cwd(), EXPORT_TEMP_DIR));
      }
    } catch (dirErr) {
      if ((dirErr as NodeJS.ErrnoException).code === "ENOENT") {
        console.log("Temporary export directory already removed or empty.");
      } else {
        console.error("Error cleaning up temp export directory:", dirErr);
      }
    }

    return new NextResponse(new Blob([new Uint8Array(fileBuffer)]), {
      headers,
    });
  } catch (error) {
    console.error("Error serving exported file:", error);
    return new NextResponse("File not found or error during download.", {
      status: 404,
    });
  }
}
