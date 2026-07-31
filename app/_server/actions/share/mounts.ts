import path from "path";
import fs from "fs/promises";
import { Modes } from "@/app/_types/enums";
import { SharingPermissions } from "@/app/_types/core";
import { SharedMount } from "@/app/_types/sharing";
import {
  ARCHIVED_DIR_NAME,
  DATA_DIR,
  EXCLUDED_DIRS,
  NOTES_DIR,
  CHECKLISTS_DIR,
} from "@/app/_consts/files";
import { mountName, parseSharedWith } from "@/app/_utils/sharing-utils";
import {
  getOrCompute,
  dropByPrefix,
} from "@/app/_server/actions/lib/metadata-cache";
import { listMounts, catAccess } from "./access";

const MOUNTS_CACHE_PREFIX = "mounts:";

interface MountableItem {
  uuid?: string;
  category?: string;
  sharedWith?: string | string[];
}

export const userDirFor = (mode: Modes, username: string): string =>
  mode === Modes.CHECKLISTS ? CHECKLISTS_DIR(username) : NOTES_DIR(username);

const _ownTopNames = async (
  mode: Modes,
  username: string,
): Promise<string[]> => {
  const dir = path.join(process.cwd(), userDirFor(mode, username));
  const excluded = [...EXCLUDED_DIRS, ARCHIVED_DIR_NAME];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !excluded.includes(entry.name))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
};

const _mountsKey = (mode: Modes, username: string): string =>
  `${MOUNTS_CACHE_PREFIX}${mode}:${username}`;

const _cachedMounts = async (
  mode: Modes,
  username: string,
): Promise<SharedMount[]> => {
  const watched = path.join(process.cwd(), DATA_DIR, mode);

  return getOrCompute(_mountsKey(mode, username), watched, () =>
    listMounts(mode, username),
  );
};

export function dropMounts(mode: Modes) {
  dropByPrefix(`${MOUNTS_CACHE_PREFIX}${mode}:`);
}

export const mountsFor = async (
  mode: Modes,
  username: string,
): Promise<SharedMount[]> => {
  const [mounts, ownNames] = await Promise.all([
    _cachedMounts(mode, username),
    _ownTopNames(mode, username),
  ]);

  const taken = [...ownNames];

  return mounts.map((mount) => {
    const displayName = mountName(mount, taken);
    taken.push(displayName);
    return { ...mount, displayName };
  });
};

const _isUnder = (parent: string, category: string): boolean =>
  category === parent || category.startsWith(`${parent}/`);

const _mountedPath = (mount: SharedMount, category: string): string => {
  if (mount.isImplicit) return mount.displayName;

  const relative = category.slice(mount.categoryPath.length).replace(/^\//, "");
  return relative ? `${mount.displayName}/${relative}` : mount.displayName;
};

export const mountedItems = async <T extends MountableItem>(
  mode: Modes,
  username: string,
  mount: SharedMount,
  ownerItems: T[],
): Promise<T[]> => {
  const catCache = new Map<string, SharingPermissions | null>();
  const ownerDir = path.join(process.cwd(), userDirFor(mode, mount.owner));
  const allowed: T[] = [];

  for (const item of ownerItems) {
    const category = item.category || "";

    if (mount.isImplicit) {
      if (!item.uuid || !mount.itemUuids?.includes(item.uuid)) continue;

      allowed.push({
        ...item,
        category: _mountedPath(mount, category),
        isShared: true,
        sharedFrom: mount.owner,
        permissions: mount.permissions,
      });
      continue;
    }

    if (!_isUnder(mount.categoryPath, category)) continue;

    const explicit = parseSharedWith(item.sharedWith);

    if (explicit) {
      const perms = explicit.users[username];
      if (!perms) continue;

      allowed.push({
        ...item,
        category: _mountedPath(mount, category),
        isShared: true,
        sharedFrom: mount.owner,
        permissions: perms,
      });
      continue;
    }

    if (!catCache.has(category)) {
      const access = await catAccess(mode, path.join(ownerDir, category));
      catCache.set(category, access?.users[username] || null);
    }

    const perms = catCache.get(category);
    if (!perms) continue;

    allowed.push({
      ...item,
      category: _mountedPath(mount, category),
      isShared: true,
      sharedFrom: mount.owner,
      permissions: perms,
    });
  }

  return allowed;
};
