import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { whoGoesThere } from "@/app/_utils/api-utils";
import { fileOf } from "@/app/_server/actions/attachments/store";
import { locateItem, mayView } from "@/app/_server/actions/attachments/access";
import { CachePolicies, safeDecode, sendFile } from "@/app/_server/actions/attachments/serve";
import { deleteAs } from "@/app/_server/actions/attachments/write";
import { refuseAttachment } from "@/app/_server/api/attachment-refusals";
import { defineRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, okSchema } from "@/app/_schemas/api/common";
import { attachmentFileParams } from "@/app/_schemas/api/attachments";

export const dynamic = "force-dynamic";

const _turnAway = (viewer: string | null): NextResponse =>
  viewer
    ? new NextResponse("Not found", { status: 404 })
    : new NextResponse("Unauthorized", { status: 401 });

const _isFile = (filePath: string): Promise<boolean> =>
  fs.lstat(filePath).then(
    (stats) => stats.isFile(),
    () => false,
  );

export const GET = async (
  request: NextRequest,
  props: { params: Promise<{ itemUuid: string; name: string }> },
) => {
  try {
    const { itemUuid, name } = await props.params;
    const decoded = safeDecode(name);
    const filePath = fileOf(itemUuid, decoded);
    if (!filePath) return new NextResponse("Invalid attachment", { status: 400 });

    const viewer = (await whoGoesThere(request))?.username ?? null;
    if (!(await _isFile(filePath))) return _turnAway(viewer);

    const item = await locateItem(itemUuid);
    if (!item || !(await mayView(item, viewer))) return _turnAway(viewer);

    return await sendFile(request, filePath, decoded, CachePolicies.PRIVATE);
  } catch (error) {
    console.error("Error serving attachment:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

export const DELETE = defineRoute(
  {
    id: "deleteAttachment",
    method: HttpMethod.DELETE,
    path: "/attachment/{itemUuid}/{name}",
    tag: ApiTag.ATTACHMENTS,
    summary: "Delete an attachment",
    description:
      "Removes a file from a note or checklist the API key owner can delete from. Anywhere the item still embeds it will show it as missing.",
    params: attachmentFileParams,
    responses: {
      200: { description: "Deleted", schema: okSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ user, params: { itemUuid, name } }) => {
    const result = await deleteAs(user.username, itemUuid, safeDecode(name));
    if (!result.success) return refuseAttachment(result.error);

    return NextResponse.json({ success: true });
  },
);
