import path from "path";
import { DATA_DIR, USERS_FILE } from "@/app/_consts/files";
import { modeFor } from "@/app/_utils/sharing-utils";
import { readJsonFile } from "../file";
import { Result, ItemType, User, PublicUserInfo } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { capitalize } from "lodash";
import { logAudit } from "@/app/_server/actions/log";
import { toPublicUser } from "@/app/_utils/user-sanitize-utils";

export const getUserIndex = async (username: string): Promise<number> => {
  const allUsers = await readJsonFile(USERS_FILE);
  return allUsers.findIndex((user: User) => user.username === username);
};

const _ownerOnDisk = async (
  uuid: string,
  itemType: ItemType
): Promise<string | null> => {
  const { grepFindFileByUuid } = await import("@/app/_utils/grep-utils");
  const modeDir = path.join(process.cwd(), DATA_DIR, modeFor(itemType));
  const found = await grepFindFileByUuid(modeDir, uuid);

  return found ? path.relative(modeDir, found.filePath).split(path.sep)[0] : null;
};

export const getUserByItemUuid = async (
  uuid: string,
  itemType: ItemType
): Promise<Result<PublicUserInfo>> => {
  try {
    const owner = await _ownerOnDisk(uuid, itemType);
    const users: User[] = owner ? await readJsonFile(USERS_FILE) : [];
    const user = users.find((candidate) => candidate.username === owner);

    if (user) {
      return { success: true, data: toPublicUser(user)! };
    }

    if (owner) {
      await logAudit({
        level: "DEBUG",
        action: "user_item_check",
        category: "user",
        success: false,
        errorMessage: `Item folder has no matching user: ${owner}`,
      });
    }

    return {
      success: false,
      error: `${itemType === ItemTypes.NOTE
        ? capitalize(ItemTypes.NOTE)
        : capitalize(ItemTypes.CHECKLIST)
        } not found`,
    };
  } catch (error) {
    console.error(`Error in getUserBy${itemType}Uuid:`, error);
    return { success: false, error: `Failed to find ${itemType} owner` };
  }
};
