import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { AttachmentKinds } from "@/app/_consts/attachments";
import { envelope, timestamp, uuidParam } from "@/app/_schemas/api/common";

export const attachmentItemParams = uuidParam("itemUuid", "Note or checklist");

export const attachmentFileParams = attachmentItemParams.extend({
  name: z.string().describe("Stored file name, the fileName of the attachment"),
});

export const attachmentUploadBody = z.object({
  file: z.file({ error: "file is required" }).describe("The file to attach"),
});

export const attachmentSchema = z
  .object({
    fileName: z.string().describe("Name the file is stored under, made safe and unique within the item"),
    name: z.string(),
    url: z.string().describe("Path to fetch the file from, ready to embed in the item's markdown"),
    type: z.enum(AttachmentKinds),
    mimeType: z.string(),
    size: z.number().describe("Bytes"),
    uploadedAt: timestamp,
    itemUuid: z.string().optional(),
  })
  .register(apiNames, { id: "Attachment" });

export const attachmentEnvelope = envelope(attachmentSchema);
