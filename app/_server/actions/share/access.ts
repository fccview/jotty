"use server";

import path from "path";
import { Modes, PermissionTypes } from "@/app/_types/enums";
import { SharingPermissions } from "@/app/_types/core";
import { CategoryInfo, EffectiveAccess, SharedMount } from "@/app/_types/sharing";
import { DATA_DIR } from "@/app/_consts/files";
import {
  PUBLIC_USER,
  CATEGORY_INFO_FILE,
  IMPLICIT_MOUNT_PREFIX,
} from "@/app/_consts/sharing";
import { parseSharedWith } from "@/app/_utils/sharing-utils";
import {
  grepExtractFrontmatter,
  grepFilesByText,
} from "@/app/_utils/grep-utils";
import { readCatInfo } from "./category-info";

interface OwnerLocation {
  owner: string;
  userDir: string;
  categoryPath: string;
}

const _modeDir = (mode: Modes): string =>
  path.join(process.cwd(), DATA_DIR, mode);

const _locate = (mode: Modes, filePath: string): OwnerLocation | null => {
  const abs = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  const relative = path.relative(_modeDir(mode), abs);

  if (!relative || relative.startsWith("..")) return null;

  const segments = relative.split(path.sep);
  const owner = segments.shift();

  if (!owner) return null;

  segments.pop();

  return {
    owner,
    userDir: path.join(_modeDir(mode), owner),
    categoryPath: segments.join("/"),
  };
};

const _merge = (
  into: Record<string, SharingPermissions>,
  from: Record<string, SharingPermissions>,
): void => {
  Object.entries(from).forEach(([username, perms]) => {
    const current = into[username];
    into[username] = current
      ? {
          canRead: current.canRead || perms.canRead,
          canEdit: current.canEdit || perms.canEdit,
          canDelete: current.canDelete || perms.canDelete,
        }
      : perms;
  });
};

const _chainGrants = async (
  userDir: string,
  startDir: string,
): Promise<{ users: Record<string, SharingPermissions>; via?: string }> => {
  const users: Record<string, SharingPermissions> = {};
  let current = startDir;
  let via: string | undefined;

  while (current.startsWith(userDir)) {
    const info = await readCatInfo(current);
    const sharing = info.sharing;

    if (sharing?.users && Object.keys(sharing.users).length > 0) {
      _merge(users, sharing.users);
      via = via || path.relative(userDir, current) || undefined;
    }

    if (sharing?.inherit === false) break;
    if (current === userDir) break;

    current = path.dirname(current);
  }

  return { users, via };
};

export const resolveAccess = async (
  mode: Modes,
  filePath: string,
): Promise<EffectiveAccess | null> => {
  const location = _locate(mode, filePath);
  if (!location) return null;

  const metadata = await grepExtractFrontmatter(filePath);
  const explicit = parseSharedWith(metadata?.sharedWith);

  if (explicit) {
    return {
      owner: location.owner,
      users: explicit.users,
      isPublic: Boolean(explicit.users[PUBLIC_USER]),
      inherited: false,
    };
  }

  const { users, via } = await _chainGrants(
    location.userDir,
    path.dirname(
      path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath),
    ),
  );

  return {
    owner: location.owner,
    users,
    isPublic: Boolean(users[PUBLIC_USER]),
    inherited: true,
    viaCategory: via,
  };
};

export const catAccess = async (
  mode: Modes,
  categoryDir: string,
): Promise<EffectiveAccess | null> => {
  const location = _locate(mode, path.join(categoryDir, "placeholder"));
  if (!location) return null;

  const { users, via } = await _chainGrants(location.userDir, categoryDir);

  return {
    owner: location.owner,
    users,
    isPublic: Boolean(users[PUBLIC_USER]),
    inherited: true,
    viaCategory: via,
  };
};

const PERMISSION_FIELD: Record<PermissionTypes, keyof SharingPermissions> = {
  [PermissionTypes.READ]: "canRead",
  [PermissionTypes.EDIT]: "canEdit",
  [PermissionTypes.DELETE]: "canDelete",
};

export const canReachFile = async (
  mode: Modes,
  filePath: string,
  username: string,
  permission: PermissionTypes,
): Promise<boolean> => {
  const access = await resolveAccess(mode, filePath);
  if (!access) return false;
  if (access.owner === username) return true;

  const perms = access.users[username];
  if (!perms) return false;

  return perms[PERMISSION_FIELD[permission]] === true;
};

export const sharedFiles = async (
  mode: Modes,
  username: string,
): Promise<string[]> => {
  const matches = await grepFilesByText(_modeDir(mode), username, "*.md");
  const ownDir = path.join(_modeDir(mode), username);

  return matches.filter((filePath) => !filePath.startsWith(ownDir));
};

const _topMost = (dirs: string[]): string[] =>
  dirs.filter(
    (dir) => !dirs.some((other) => other !== dir && dir.startsWith(`${other}${path.sep}`)),
  );

export const listMounts = async (
  mode: Modes,
  username: string,
): Promise<SharedMount[]> => {
  const [catDirs, fileMatches] = await Promise.all([
    sharedCats(mode, username),
    sharedFiles(mode, username),
  ]);

  const confirmed: { dir: string; info: CategoryInfo; location: OwnerLocation }[] =
    [];

  for (const dir of catDirs) {
    const info = await readCatInfo(dir);
    const location = _locate(mode, path.join(dir, "placeholder"));

    if (info.uuid && location && info.sharing?.users?.[username]) {
      confirmed.push({ dir, info, location });
    }
  }

  const mountDirs = _topMost(confirmed.map((entry) => entry.dir));
  const mounts: SharedMount[] = confirmed
    .filter((entry) => mountDirs.includes(entry.dir))
    .map((entry) => ({
      owner: entry.location.owner,
      mode,
      categoryUuid: entry.info.uuid!,
      categoryPath: entry.location.categoryPath,
      displayName: path.basename(entry.dir),
      permissions: entry.info.sharing!.users[username],
      isImplicit: false,
    }));

  const loose = new Map<string, { uuids: string[]; perms: SharingPermissions }>();

  for (const filePath of fileMatches) {
    if (mountDirs.some((dir) => filePath.startsWith(`${dir}${path.sep}`))) {
      continue;
    }

    const access = await resolveAccess(mode, filePath);
    const perms = access?.users[username];

    if (!access || !perms || access.inherited) continue;

    const metadata = await grepExtractFrontmatter(filePath);
    const uuid = typeof metadata?.uuid === "string" ? metadata.uuid : null;
    if (!uuid) continue;

    const existing = loose.get(access.owner);
    if (existing) {
      existing.uuids.push(uuid);
    } else {
      loose.set(access.owner, { uuids: [uuid], perms });
    }
  }

  loose.forEach((entry, owner) => {
    mounts.push({
      owner,
      mode,
      categoryUuid: `${IMPLICIT_MOUNT_PREFIX}${owner}`,
      categoryPath: owner,
      displayName: owner,
      permissions: entry.perms,
      isImplicit: true,
      itemUuids: entry.uuids,
    });
  });

  return mounts;
};

export const sharersOf = async (
  mode: Modes,
  username: string,
): Promise<string[]> => {
  const mounts = await listMounts(mode, username);
  return Array.from(new Set(mounts.map((mount) => mount.owner)));
};

export const sharedCats = async (
  mode: Modes,
  username: string,
): Promise<string[]> => {
  const matches = await grepFilesByText(
    _modeDir(mode),
    username,
    CATEGORY_INFO_FILE,
  );
  const ownDir = path.join(_modeDir(mode), username);

  return matches
    .map((filePath) => path.dirname(filePath))
    .filter((dirPath) => !dirPath.startsWith(ownDir));
};
