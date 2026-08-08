"use server";

import path from "path";
import {
  ensureDir,
  getUserModeDir,
  readOrderFile,
  serverReadDir,
} from "@/app/_server/actions/file";
import { Modes } from "@/app/_types/enums";
import { Category } from "@/app/_types";
import { SharedMount } from "@/app/_types/sharing";
import { buildCategoryTree } from "@/app/_utils/category-utils";
import { getUsername } from "@/app/_server/actions/users";
import { mountsFor, userDirFor } from "@/app/_server/actions/share/mounts";
import { catAccess } from "@/app/_server/actions/share/access";

const _mdCount = async (dir: string): Promise<number> => {
  try {
    const entries = await serverReadDir(dir);
    return entries.filter((e) => e.isFile() && e.name.endsWith(".md")).length;
  } catch (error) {
    console.warn("Could not count items in shared folder:", dir, error);
    return 0;
  }
};

const _mountTree = async (
  mode: Modes,
  username: string,
  mount: SharedMount,
): Promise<Category[]> => {
  if (mount.isImplicit) {
    return [
      {
        name: mount.displayName,
        count: mount.itemUuids?.length || 0,
        path: mount.displayName,
        level: 0,
        uuid: mount.categoryUuid,
        sharedFrom: mount.owner,
        permissions: mount.permissions,
        isLoose: true,
      },
    ];
  }

  const ownerDir = path.join(
    process.cwd(),
    userDirFor(mode, mount.owner),
    mount.categoryPath,
  );

  const root: Category = {
    name: mount.displayName,
    count: await _mdCount(ownerDir),
    path: mount.displayName,
    level: 0,
    uuid: mount.categoryUuid,
    sharedFrom: mount.owner,
    permissions: mount.permissions,
  };

  const subTree = await buildCategoryTree(ownerDir, mount.displayName, 1);

  const granted = await Promise.all(
    subTree.map(async (category) => {
      const relative = category.path.slice(mount.displayName.length + 1);
      const access = await catAccess(mode, path.join(ownerDir, relative));

      return access?.users[username];
    }),
  );

  const visible = subTree
    .map((category, index) => ({ category, perms: granted[index] }))
    .filter(({ perms }) => Boolean(perms))
    .map(({ category, perms }) => ({
      ...category,
      sharedFrom: mount.owner,
      permissions: perms,
    }));

  return [root, ...visible];
};

const _rootOf = (category: Category): string => category.path.split("/")[0];

const _ordered = (groups: Map<string, Category[]>, uuids?: string[]) => {
  const roots = Array.from(groups.keys());
  const ranked = (uuids || [])
    .map((uuid) =>
      roots.find((root) => groups.get(root)?.[0]?.uuid === uuid),
    )
    .filter((root): root is string => Boolean(root));

  const rest = roots.filter((root) => !ranked.includes(root));

  return [...ranked, ...rest].flatMap((root) => groups.get(root) || []);
};

export const getCategories = async (mode: Modes, username?: string) => {
  try {
    const dir = await getUserModeDir(mode, username);
    await ensureDir(dir);

    const categories = await buildCategoryTree(dir);
    const viewer = username || (await getUsername());

    if (!viewer) {
      return { success: true, data: categories };
    }

    const mounts = await mountsFor(mode, viewer);

    for (const mount of mounts) {
      categories.push(...(await _mountTree(mode, viewer, mount)));
    }

    const groups = new Map<string, Category[]>();

    categories.forEach((category) => {
      const root = _rootOf(category);
      groups.set(root, [...(groups.get(root) || []), category]);
    });

    const order = await readOrderFile(dir);

    return { success: true, data: _ordered(groups, order?.categories) };
  } catch (error) {
    console.error("Error in getCategories:", error);
    return { error: "Failed to fetch document categories" };
  }
};
