import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { EXPORT_TEMP_DIR } from "@/app/_consts/files";
import { resolvePath } from "@/app/_utils/path-utils";
import {
  ApiCaller,
  seesAllContent,
  whoGoesThere,
} from "@/app/_utils/api-utils";

export const dynamic = "force-dynamic";

const OWN_EXPORT_SUFFIX = /^_content_\d+\.zip$/;

const ownsExport = (username: string, filename: string): boolean =>
  filename.startsWith(username) &&
  OWN_EXPORT_SUFFIX.test(filename.slice(username.length));

const mayDownload = async (
  caller: ApiCaller,
  filename: string,
): Promise<boolean> =>
  ownsExport(caller.username, filename) || (await seesAllContent(caller));

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ filename: string }> },
) {
  const caller = await whoGoesThere(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await props.params;
  const filename = params.filename;

  if (!(await mayDownload(caller, filename))) {
    console.warn(`Export download refused for ${caller.username}: ${filename}`);
    return new NextResponse("File not found or error during download.", {
      status: 404,
    });
  }

  const baseDir = path.resolve(process.cwd(), EXPORT_TEMP_DIR);
  const resolved = resolvePath(baseDir, filename);
  if (!resolved.ok) {
    return new NextResponse("File not found or error during download.", {
      status: 404,
    });
  }

  try {
    const fileBuffer = await fs.readFile(resolved.absolutePath);
    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    await fs.unlink(resolved.absolutePath);
    try {
      const filesInDir = await fs.readdir(baseDir);
      if (filesInDir.length === 0) {
        await fs.rmdir(baseDir);
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
