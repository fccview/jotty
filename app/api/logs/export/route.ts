import { NextResponse } from "next/server";
import { digUpLogs, everyUsername, sieveLogs } from "@/app/_server/actions/lib/audit-trail";
import { defineRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod, MediaType } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { LogExportFormat, logExportBody, logFileSchema } from "@/app/_schemas/api/logs";
import { AuditLogEntry } from "@/app/_types";

export const dynamic = "force-dynamic";

const CSV_HEADERS = [
  "Timestamp",
  "Level",
  "Username",
  "Action",
  "Category",
  "Resource Type",
  "Resource ID",
  "Resource Title",
  "Success",
  "IP Address",
  "Error Message",
];

const _csvCell = (field: unknown) => `"${String(field).replace(/"/g, '""')}"`;

const _toCsv = (logs: AuditLogEntry[]) =>
  [
    CSV_HEADERS.join(","),
    ...logs.map((log) =>
      [
        log.timestamp,
        log.level,
        log.username,
        log.action,
        log.category,
        log.resourceType || "",
        log.resourceId || "",
        log.resourceTitle || "",
        log.success,
        log.ipAddress,
        log.errorMessage || "",
      ]
        .map(_csvCell)
        .join(","),
    ),
  ].join("\n");

export const POST = defineRoute(
  {
    id: "exportLogs",
    method: HttpMethod.POST,
    path: "/logs/export",
    tag: ApiTag.LOGS,
    summary: "Download audit log entries",
    description: "Sends matching entries as a JSON or CSV attachment, newest first. You export your own entries. Admins can export everybody's, or one user's with username.",
    body: logExportBody,
    responses: {
      200: { description: "JSON array of entries, or CSV when format is csv", schema: logFileSchema, alternatives: [{ mediaType: MediaType.CSV }] },
      400: ERRORS[400],
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, body }) => {
    const filters = { ...body.filters, username: user.isAdmin ? body.filters.username : user.username };
    const usernames = filters.username ? [filters.username] : await everyUsername();

    const matches = sieveLogs(await digUpLogs(usernames, filters), filters);
    const logs = filters.limit ? matches.slice(0, filters.limit) : matches;

    const isJson = body.format === LogExportFormat.JSON;
    const filename = `audit-logs-${Date.now()}.${body.format}`;

    return new NextResponse(isJson ? JSON.stringify(logs, null, 2) : _toCsv(logs), {
      headers: {
        "Content-Type": isJson ? MediaType.JSON : MediaType.CSV,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
);
