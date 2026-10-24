"use server";

import { getCurrentUser } from "@/app/_server/actions/users";
import { ensureUserUuid, patchUserFields } from "@/app/_server/actions/users/records";
import { MAX_FILE_SIZE } from "@/app/_consts/files";
import { AttachmentErrors, AttachmentKinds, avatarUrl } from "@/app/_consts/attachments";
import { avatarExtFor, saveAvatar } from "@/app/_server/actions/attachments/avatars";
import type { FileItem, Result } from "@/app/_types";
import { getSettings } from "../config";

export const uploadUserAvatar = async (formData: FormData): Promise<Result<FileItem>> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) {
      return { success: false, error: AttachmentErrors.UNAUTHENTICATED };
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, error: AttachmentErrors.NO_FILE };
    }

    const settings = await getSettings();
    if (file.size > (settings?.maximumFileSize || MAX_FILE_SIZE)) {
      return { success: false, error: AttachmentErrors.TOO_LARGE };
    }

    const ext = avatarExtFor(file.name, file.type);
    if (!ext) {
      return { success: false, error: AttachmentErrors.NOT_IMAGE };
    }

    const userUuid = await ensureUserUuid(user.username);
    if (!userUuid) {
      return { success: false, error: AttachmentErrors.FAILED };
    }

    const version = await saveAvatar(
      userUuid,
      ext,
      Buffer.from(await file.arrayBuffer()),
    );
    const url = avatarUrl(userUuid, version);
    await patchUserFields(user.username, { avatarUrl: url });

    return {
      success: true,
      data: {
        fileName: `${userUuid}${ext}`,
        name: file.name,
        url,
        type: AttachmentKinds.IMAGE,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date(version).toISOString(),
      },
    };
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return { success: false, error: AttachmentErrors.FAILED };
  }
};
