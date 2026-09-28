import { NextResponse } from "next/server";
import { seesAllContent } from "@/app/_utils/api-utils";
import {
  buildAllContent,
  buildUserContent,
  readExportProgress,
} from "@/app/_server/actions/export/builders";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import {
  exportProgressSchema,
  exportRequestBody,
  exportStartedSchema,
} from "@/app/_schemas/api/exports";
import { ExportResult } from "@/app/_types";
import { ExportKind } from "@/app/_types/export";

export const dynamic = "force-dynamic";

const ADMIN_ONLY = "Forbidden: Admin access with content permissions required";
const BROWSER_ONLY = "This export holds every user's credentials. Run it from the admin page while logged in";

const SESSION_ONLY_EXPORTS = new Set<ExportKind>([ExportKind.ALL_USERS, ExportKind.WHOLE_DATA]);

export const POST = defineRoute(
  {
    id: "requestExport",
    method: HttpMethod.POST,
    path: "/exports",
    tag: ApiTag.EXPORTS,
    summary: "Start an export",
    description: "Builds a zip and answers once it is ready with the path to download it from. Poll GET /exports from another request to follow progress. all_users_data and whole_data_folder contain every user's credentials, so they only run from the admin page in a logged-in browser and answer 403 here.",
    body: exportRequestBody,
    responses: {
      200: { description: "Export ready", schema: exportStartedSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      500: ERRORS[500],
    },
  },
  async ({ user, body }) => {
    const hasContentAccess = await seesAllContent(user);
    let result: ExportResult;

    if (body.type === ExportKind.USER_CONTENT) {
      if (!body.username) return refuse("Username is required for user export", 400);
      if (body.username !== user.username && !hasContentAccess) {
        return refuse("Forbidden: You can only export your own data", 403);
      }
      result = await buildUserContent(body.username);
    } else {
      if (!hasContentAccess) return refuse(ADMIN_ONLY, 403);
      if (SESSION_ONLY_EXPORTS.has(body.type)) return refuse(BROWSER_ONLY, 403);
      result = await buildAllContent();
    }

    if (!result.success) {
      return refuse(result.error || `Failed to export ${body.type}`, 500);
    }

    return NextResponse.json({ success: true, downloadUrl: result.downloadUrl });
  },
);

export const GET = defineRoute(
  {
    id: "getExportProgress",
    method: HttpMethod.GET,
    path: "/exports",
    tag: ApiTag.EXPORTS,
    summary: "Get export progress",
    description: "Percentage and message of the latest export on this instance, whoever started it.",
    responses: {
      200: { description: "Progress", schema: exportProgressSchema },
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async () => NextResponse.json(readExportProgress()),
);
