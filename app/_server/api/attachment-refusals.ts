import { AttachmentErrors, isAttachmentError } from "@/app/_consts/attachments";
import { refuse } from "./define-route";

const REFUSALS: Record<AttachmentErrors, { message: string; status: number }> = {
  [AttachmentErrors.UNAUTHENTICATED]: { message: "Unauthorized", status: 401 },
  [AttachmentErrors.NO_FILE]: { message: "file is required", status: 400 },
  [AttachmentErrors.TOO_LARGE]: { message: "File is bigger than this instance allows", status: 413 },
  [AttachmentErrors.NOT_FOUND]: { message: "Not found", status: 404 },
  [AttachmentErrors.DENIED]: { message: "Forbidden", status: 403 },
  [AttachmentErrors.BAD_NAME]: { message: "Invalid attachment name", status: 400 },
  [AttachmentErrors.NOT_IMAGE]: { message: "File is not an image", status: 400 },
  [AttachmentErrors.FAILED]: { message: "Internal server error", status: 500 },
};

export const refuseAttachment = (error?: string) => {
  const { message, status } = REFUSALS[isAttachmentError(error) ? error : AttachmentErrors.FAILED];
  return refuse(message, status);
};
