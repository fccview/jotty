import { NextResponse } from "next/server";
import { uploadAs } from "@/app/_server/actions/attachments/write";
import { refuseAttachment } from "@/app/_server/api/attachment-refusals";
import { defineRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod, MediaType } from "@/app/_server/api/contract";
import { ERRORS, errorSchema } from "@/app/_schemas/api/common";
import {
  attachmentEnvelope,
  attachmentItemParams,
  attachmentUploadBody,
} from "@/app/_schemas/api/attachments";

export const dynamic = "force-dynamic";

export const POST = defineRoute(
  {
    id: "uploadAttachment",
    method: HttpMethod.POST,
    path: "/attachment/{itemUuid}",
    tag: ApiTag.ATTACHMENTS,
    summary: "Upload an attachment",
    description:
      "Attaches a file to a note or checklist the API key owner can edit. Send it as multipart/form-data in a field called file. The name is made safe and gets a numeric suffix if the item already has a file with that name, so read fileName and url from the answer. The file is only stored, embed url in the item's content yourself. Files over the instance's maximum file size are refused with 413.",
    params: attachmentItemParams,
    body: attachmentUploadBody,
    bodyType: MediaType.FORM,
    responses: {
      200: { description: "The stored attachment", schema: attachmentEnvelope },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      413: { description: "File is bigger than this instance allows", schema: errorSchema },
      500: ERRORS[500],
    },
  },
  async ({ user, params: { itemUuid }, body: { file } }) => {
    const result = await uploadAs(user.username, itemUuid, file);
    if (!result.success) return refuseAttachment(result.error);

    return NextResponse.json({ success: true, data: result.data });
  },
);
