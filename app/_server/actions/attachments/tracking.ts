const _relations = () => import("@/app/_server/actions/relations/attachments");

const _resync = async (itemUuid: string) => {
  try {
    await (await _relations()).syncAttachmentFolder(itemUuid, true);
  } catch (error) {
    console.error(`Attachments index could not refresh ${itemUuid}:`, error);
  }
};

export const noteAttachments = (itemUuid: string): Promise<void> =>
  _resync(itemUuid);

export const forgetAttachments = (itemUuid: string): Promise<void> =>
  _resync(itemUuid);
