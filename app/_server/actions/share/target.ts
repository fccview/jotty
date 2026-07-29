import path from "path";
import fs from "fs/promises";
import { Modes, PermissionTypes } from "@/app/_types/enums";
import { SharingPermissions } from "@/app/_types/core";
import { SharedMount } from "@/app/_types/sharing";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { mountsFor, userDirFor } from "./mounts";

export interface TargetLocation {
  dir: string;
  owner: string;
  category: string;
  isMount: boolean;
  isImplicit: boolean;
  permissions?: SharingPermissions;
  mount?: SharedMount;
}

const PERMISSION_FIELD: Record<PermissionTypes, keyof SharingPermissions> = {
  [PermissionTypes.READ]: "canRead",
  [PermissionTypes.EDIT]: "canEdit",
  [PermissionTypes.DELETE]: "canDelete",
};

const _matches = (mount: SharedMount, category: string): boolean =>
  category === mount.displayName ||
  category.startsWith(`${mount.displayName}/`);

const _isOwned = async (
  mode: Modes,
  username: string,
  category: string,
): Promise<boolean> => {
  const root = category.split("/")[0];

  try {
    const stats = await fs.stat(
      path.join(process.cwd(), userDirFor(mode, username), root),
    );
    return stats.isDirectory();
  } catch {
    return false;
  }
};

export const targetDir = async (
  mode: Modes,
  username: string,
  category: string,
): Promise<TargetLocation> => {
  const own: TargetLocation = {
    dir: path.join(process.cwd(), userDirFor(mode, username), category),
    owner: username,
    category,
    isMount: false,
    isImplicit: false,
  };

  if (!category) return own;
  if (await _isOwned(mode, username, category)) return own;

  const mounts = await mountsFor(mode, username);
  const mount = mounts.find((candidate) => _matches(candidate, category));

  if (!mount) return own;

  const relative = category.slice(mount.displayName.length).replace(/^\//, "");
  const owned = mount.isImplicit
    ? ""
    : [mount.categoryPath, relative].filter(Boolean).join("/");

  return {
    dir: path.join(process.cwd(), userDirFor(mode, mount.owner), owned),
    owner: mount.owner,
    category: owned,
    isMount: true,
    isImplicit: mount.isImplicit,
    permissions: mount.permissions,
    mount,
  };
};

interface Locatable {
  owner?: string;
  category?: string;
  id?: string;
}

export const diskPath = async (
  mode: Modes,
  username: string,
  item: Locatable,
): Promise<string> => {
  const target = await targetDir(mode, username, item.category || "");
  const owner = item.owner || target.owner;

  return path.join(
    process.cwd(),
    userDirFor(mode, owner),
    target.category || UNCATEGORIZED,
    `${item.id}.md`,
  );
};

export const shownAs = async (
  mode: Modes,
  username: string,
  owner: string,
  category: string,
): Promise<string> => {
  if (owner === username) return category;

  const mounts = await mountsFor(mode, username);
  const mount = mounts.find(
    (candidate) =>
      candidate.owner === owner &&
      !candidate.isImplicit &&
      (category === candidate.categoryPath ||
        category.startsWith(`${candidate.categoryPath}/`)),
  );

  if (!mount) return category;

  const relative = category
    .slice(mount.categoryPath.length)
    .replace(/^\//, "");

  return relative ? `${mount.displayName}/${relative}` : mount.displayName;
};

export const bouncer = async (
  target: TargetLocation,
  username: string,
  permission: PermissionTypes,
): Promise<{ allowed: boolean; error?: string }> => {
  if (target.owner === username) return { allowed: true };

  if (target.isImplicit) {
    return { allowed: false, error: "You're not on the list" };
  }

  const granted = target.permissions?.[PERMISSION_FIELD[permission]] === true;

  return granted
    ? { allowed: true }
    : { allowed: false, error: "You're not on the list" };
};
