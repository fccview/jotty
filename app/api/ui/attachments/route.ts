import { NextRequest, NextResponse } from "next/server";
import { AttachmentOps } from "@/app/_consts/ui-api";
import {
  attachmentFolders,
  folderFiles,
  searchAttachments,
} from "@/app/_server/actions/attachments/browse";

export const dynamic = "force-dynamic";

const NOT_SIGNED_IN = "Not authenticated";

const _answer = (body: Record<string, unknown>) => {
  switch (body.op) {
    case AttachmentOps.FOLDERS:
      return attachmentFolders(body.offset);
    case AttachmentOps.FILES:
      return folderFiles(body.itemUuid, body.offset);
    case AttachmentOps.SEARCH:
      return searchAttachments(body.query, body.offset);
    default:
      return Promise.resolve({ success: false, error: "Unknown attachments request" });
  }
};

export const POST = async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Invalid attachments request" }, { status: 400 });
  }

  try {
    const result = await _answer(body as Record<string, unknown>);
    const status = result.success ? 200 : result.error === NOT_SIGNED_IN ? 401 : 400;
    return NextResponse.json(result, { status });
  } catch (error) {
    console.error("Attachments request failed:", error);
    return NextResponse.json({ success: false, error: "Attachments request failed" }, { status: 500 });
  }
};
