import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { EXPORT_TEMP_DIR } from "@/app/_consts/files";
import { resolvePath } from "@/app/_utils/path-utils";
import { ApiCaller, seesAllContent } from "@/app/_utils/api-utils";
import { defineRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod, MediaType, RouteAuth } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { exportFileParams, zipFileSchema } from "@/app/_schemas/api/exports";
import { getCurrentUser } from "@/app/_server/actions/users";
import {
  EXPORT_TOKEN_BYTES,
  SESSION_ONLY_EXPORT_PREFIXES,
} from "@/app/_server/actions/export/naming";

export const dynamic = "force-dynamic";

const OWN_EXPORT_SUFFIX = new RegExp(`^_content_\\d+_[a-f0-9]{${EXPORT_TOKEN_BYTES * 2}}\\.zip$`);
const NOT_FOUND = "File not found or error during download.";

const ownsExport = (username: string, filename: string): boolean =>
  filename.startsWith(username) &&
  OWN_EXPORT_SUFFIX.test(filename.slice(username.length));

const holdsCredentials = (filename: string): boolean =>
  SESSION_ONLY_EXPORT_PREFIXES.some((prefix) => filename.startsWith(prefix));

const inBrowser = async (caller: ApiCaller): Promise<boolean> =>
  (await getCurrentUser())?.username === caller.username;

const mayDownload = async (caller: ApiCaller, filename: string): Promise<boolean> => {
  if (holdsCredentials(filename)) {
    return (await seesAllContent(caller)) && (await inBrowser(caller));
  }

  return ownsExport(caller.username, filename) || (await seesAllContent(caller));
};

const _notFound = () => new NextResponse(NOT_FOUND, { status: 404 });

const _tidyTempDir = async (baseDir: string) => {
  try {
    if ((await fs.readdir(baseDir)).length === 0) await fs.rmdir(baseDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("Temporary export directory already removed or empty.");
    } else {
      console.error("Error cleaning up temp export directory:", error);
    }
  }
};

export const GET = defineRoute(
  {
    id: "downloadExport",
    method: HttpMethod.GET,
    path: "/exports/{filename}",
    tag: ApiTag.EXPORTS,
    summary: "Download an export",
    description: "Sends the zip once and deletes it. You can download your own user export. Admins with content access can download any, except all_users_data and whole_data_folder, which hold every user's credentials and only download in a logged-in browser. Also accepts the browser session cookie.",
    params: exportFileParams,
    responses: {
      200: { description: "The zip", schema: zipFileSchema, mediaType: MediaType.ZIP },
      401: ERRORS[401],
      404: { description: "No such export, or not yours to download (plain text body)" },
    },
    auth: RouteAuth.SESSION_OR_KEY,
  },
  async ({ user: caller, params: { filename } }) => {
    if (!(await mayDownload(caller, filename))) {
      console.warn(`Export download refused for ${caller.username}: ${filename}`);
      return _notFound();
    }

    const baseDir = path.resolve(process.cwd(), EXPORT_TEMP_DIR);
    const resolved = resolvePath(baseDir, filename);
    if (!resolved.ok) return _notFound();

    try {
      const fileBuffer = await fs.readFile(resolved.absolutePath);
      await fs.unlink(resolved.absolutePath);
      await _tidyTempDir(baseDir);

      return new NextResponse(new Blob([new Uint8Array(fileBuffer)]), {
        headers: {
          "Content-Type": MediaType.ZIP,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (error) {
      console.error("Error serving exported file:", error);
      return _notFound();
    }
  },
);
