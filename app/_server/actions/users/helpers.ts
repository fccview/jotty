"use server";

import { USERS_FILE, NOTES_DIR, CHECKLISTS_DIR } from "@/app/_consts/files";
import { readJsonFile } from "../file";
import { Result, ItemType, User } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { capitalize } from "lodash";
import { logAudit } from "@/app/_server/actions/log";

export const getUserIndex = async (username: string): Promise<number> => {
  const allUsers = await readJsonFile(USERS_FILE);
  return allUsers.findIndex((user: User) => user.username === username);
};

const findUuidInDirectory = async (
  dir: string,
  targetUuid: string
): Promise<boolean> => {
  const { grepCheckUuidExists } = await import("@/app/_utils/grep-utils");
  return grepCheckUuidExists(dir, targetUuid);
};

export const getUserByItemUuid = async (
  uuid: string,
  itemType: ItemType
): Promise<Result<User>> => {
  try {
    const users = await readJsonFile(USERS_FILE);

    for (const user of users) {
      try {
        const userDir =
          itemType === ItemTypes.NOTE
            ? NOTES_DIR(user.username)
            : CHECKLISTS_DIR(user.username);

        const found = await findUuidInDirectory(userDir, uuid);
        if (found) {
          return { success: true, data: user };
        }
      } catch (error) {
        await logAudit({
          level: "DEBUG",
          action: "user_item_check",
          category: "user",
          success: false,
          errorMessage: `Error checking items for user: ${user.username}`,
          metadata: { error: String(error) }
        });
        continue;
      }
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
