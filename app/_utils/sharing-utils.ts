import { ItemTypes, Modes, PermissionTypes, SharePerms } from "../_types/enums";
import { ItemType, SharingPermissions } from "../_types/core";
import {
  SHARED_WITH_NONE,
  SHARE_CODE_SEPARATOR,
  PUBLIC_USER,
} from "../_consts/sharing";
import { sharedWithSchema } from "../_schemas/sharing-schemas";

const CODE_TO_PERMS: Record<SharePerms, SharingPermissions> = {
  [SharePerms.READ]: { canRead: true, canEdit: false, canDelete: false },
  [SharePerms.WRITE]: { canRead: true, canEdit: true, canDelete: false },
  [SharePerms.DELETE]: { canRead: true, canEdit: true, canDelete: true },
};

export const permsFromCode = (code: string): SharingPermissions | null =>
  CODE_TO_PERMS[code as SharePerms] || null;

/**
 * Grants written before folder-scoped "create" existed carry no canCreate flag,
 * so they keep behaving as they always did and follow canEdit.
 */
export const granted = (
  perms: SharingPermissions | undefined,
  permission: PermissionTypes,
): boolean => {
  if (!perms) return false;

  if (permission === PermissionTypes.CREATE && perms.canCreate === undefined) {
    return perms.canEdit === true;
  }

  return perms[permission] === true;
};

export const codeFromPerms = (perms: SharingPermissions): SharePerms => {
  if (perms.canDelete) return SharePerms.DELETE;
  if (perms.canEdit) return SharePerms.WRITE;
  return SharePerms.READ;
};

export interface ParsedSharedWith {
  optedOut: boolean;
  users: Record<string, SharingPermissions>;
}

export const parseSharedWith = (value: unknown): ParsedSharedWith | null => {
  if (value === undefined || value === null) return null;

  const parsed = sharedWithSchema.safeParse(value);
  if (!parsed.success) return null;

  const entries = Array.isArray(parsed.data)
    ? parsed.data
    : parsed.data.split(",");

  if (
    entries.length === 0 ||
    (entries.length === 1 && entries[0].trim() === SHARED_WITH_NONE)
  ) {
    return { optedOut: true, users: {} };
  }

  const users: Record<string, SharingPermissions> = {};

  entries.forEach((entry) => {
    const [username, code] = String(entry).split(SHARE_CODE_SEPARATOR);
    const perms = permsFromCode(code || SharePerms.READ);
    if (username && perms) {
      users[username.trim()] = perms;
    }
  });

  return { optedOut: false, users };
};

export const toSharedWith = (
  users: Record<string, SharingPermissions>,
): string => {
  const entries = Object.entries(users).map(
    ([username, perms]) =>
      `${username}${SHARE_CODE_SEPARATOR}${codeFromPerms(perms)}`,
  );

  return entries.length > 0 ? entries.join(", ") : SHARED_WITH_NONE;
};

export const isPublicUser = (username: string): boolean =>
  username === PUBLIC_USER;

export const mountName = (
  mount: { displayName: string; owner: string },
  taken: string[],
): string =>
  taken.includes(mount.displayName)
    ? `${mount.displayName} (${mount.owner})`
    : mount.displayName;

interface ItemDetails {
  exists: boolean;
  isPublic: boolean;
  sharedWith: string[];
}

export const sharingInfo = (data: any, targetUuid: string) => {
  let result: ItemDetails = {
    exists: false,
    isPublic: false,
    sharedWith: [] as string[],
  };

  const isMatch = (item: { uuid?: string }) => item.uuid === targetUuid;

  for (const categoryKey in data) {
    const categoryObject = data[categoryKey];

    if (typeof categoryObject !== "object" || categoryObject === null) {
      continue;
    }

    for (const bucketName in categoryObject) {
      const list = categoryObject[bucketName];

      if (Array.isArray(list) && list.some(isMatch)) {
        result.exists = true;

        if (bucketName === "public") {
          result.isPublic = true;
        } else {
          result.sharedWith.push(bucketName);
        }
      }
    }
  }

  return result;
};

export const shareGrants = (
  data: any,
  targetUuid: string,
  itemType?: Modes,
): Record<string, SharingPermissions> => {
  const grants: Record<string, SharingPermissions> = {};
  const buckets =
    itemType !== undefined ? [itemType] : (Object.keys(data || {}) as string[]);

  for (const bucket of buckets) {
    const receivers = data?.[bucket];

    if (typeof receivers !== "object" || receivers === null) continue;

    for (const receiver in receivers) {
      if (receiver === PUBLIC_USER) continue;

      const entries = receivers[receiver];
      if (!Array.isArray(entries)) continue;

      const found = entries.find(
        (entry: { uuid?: string }) => entry.uuid === targetUuid,
      );

      if (found?.permissions) grants[receiver] = found.permissions;
    }
  }

  return grants;
};

export const getPermissions = (
  data: any,
  username: string,
  targetUuid: string,
  itemType?: Modes,
) => {
  const isMatch = (item: { uuid?: string }) => item.uuid === targetUuid;

  const categoriesToSearch =
    itemType !== undefined ? [itemType] : (Object.keys(data || {}) as string[]);

  for (const categoryKey of categoriesToSearch) {
    const categoryObject = data?.[categoryKey];

    if (typeof categoryObject !== "object" || categoryObject === null) {
      continue;
    }

    const userList = categoryObject[username];

    if (Array.isArray(userList)) {
      const foundItem = userList.find(isMatch);

      if (foundItem) {
        return foundItem.permissions || null;
      }
    }
  }

  return null;
};

export const modeFor = (itemType: ItemType): Modes =>
  itemType === ItemTypes.CHECKLIST ? Modes.CHECKLISTS : Modes.NOTES;
