import { UNCATEGORIZED } from "@/app/_consts/notes";
import { SidebarRowKinds } from "@/app/_consts/sidebar";
import type { Category, FolderStats, SidebarRow, SidebarSnapshots } from "@/app/_types";

interface Filed {
  category?: string;
}

const ROOT = "";

export const folderOf = (item: Filed): string => item.category || UNCATEGORIZED;

export const libraryEpoch = (sidebar: SidebarSnapshots): string =>
  `${sidebar.notes?.stamp || ""}.${sidebar.checklists?.stamp || ""}`;

export const groupByFolder = <T extends Filed>(items: T[]): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const folder = folderOf(item);
    const group = groups.get(folder);
    if (group) group.push(item);
    else groups.set(folder, [item]);
  }
  return groups;
};

export const childrenOf = (categories: Category[]): Map<string, Category[]> => {
  const children = new Map<string, Category[]>();
  for (const category of categories) {
    const parent = category.parent || ROOT;
    const siblings = children.get(parent);
    if (siblings) siblings.push(category);
    else children.set(parent, [category]);
  }
  return children;
};

export const folderStats = (
  categories: Category[],
  groups: Map<string, unknown[]>,
): Record<string, FolderStats> => {
  const children = childrenOf(categories);
  const stats: Record<string, FolderStats> = {};

  const totalOf = (path: string): number => {
    const known = stats[path];
    if (known) return known.total;
    const direct = groups.get(path)?.length || 0;
    const nested = (children.get(path) || []).reduce((sum, child) => sum + totalOf(child.path), 0);
    stats[path] = { direct, total: direct + nested };
    return direct + nested;
  };

  categories.forEach((category) => totalOf(category.path));
  return stats;
};

export interface InlineBudget {
  whole: number;
  firstScreen: number;
  page: number;
}

export const inlineRows = <T>(
  categories: Category[],
  groups: Map<string, T[]>,
  { whole, firstScreen, page }: InlineBudget,
): Record<string, T[]> => {
  const rows: Record<string, T[]> = {};
  const shown = categories.reduce((sum, category) => sum + (groups.get(category.path)?.length || 0), 0);

  if (shown <= whole) {
    categories.forEach((category) => {
      const group = groups.get(category.path);
      if (group?.length) rows[category.path] = group;
    });
    return rows;
  }

  const children = childrenOf(categories);
  let left = firstScreen;

  const visit = (category: Category) => {
    (children.get(category.path) || []).forEach(visit);
    const group = groups.get(category.path);
    if (!group?.length || left <= 0) return;
    const taken = group.slice(0, Math.min(page, left));
    rows[category.path] = taken;
    left -= taken.length;
  };

  (children.get(ROOT) || []).forEach(visit);
  return rows;
};

export const flattenSidebar = (
  categories: Category[],
  collapsed: Set<string>,
  stats: Record<string, FolderStats>,
): SidebarRow[] => {
  const children = childrenOf(categories);
  const roots = children.get(ROOT) || [];
  const rows: SidebarRow[] = [
    {
      kind: SidebarRowKinds.ROOT_START,
      key: "drop-root-start",
      depth: 0,
      firstRoot: roots[0]?.path,
    },
  ];

  const emit = (category: Category, depth: number, gapDepth?: number) => {
    rows.push({ kind: SidebarRowKinds.FOLDER, key: `folder::${category.path}`, depth, gapDepth, category });
    if (collapsed.has(category.path)) return;

    const subs = children.get(category.path) || [];
    rows.push({
      kind: SidebarRowKinds.FOLDER_START,
      key: `drop-start::${category.path}`,
      depth: depth + 1,
      gapDepth: depth,
      category,
      firstChild: subs[0] ? `category::${subs[0].path}` : undefined,
    });

    subs.forEach((sub) => {
      emit(sub, depth + 1);
      rows.push({
        kind: SidebarRowKinds.FOLDER_END,
        key: `drop-after-category::${sub.path}`,
        depth: depth + 1,
        category: sub,
        isRoot: false,
      });
    });

    const direct = stats[category.path]?.direct || 0;
    for (let index = 0; index < direct; index++) {
      rows.push({
        kind: SidebarRowKinds.ITEM,
        key: `item::${category.path}::${index}`,
        depth: depth + 1,
        category,
        index,
      });
    }
  };

  roots.forEach((root) => {
    emit(root, 0, 0);
    rows.push({
      kind: SidebarRowKinds.FOLDER_END,
      key: `drop-after-root::${root.path}`,
      depth: 0,
      category: root,
      isRoot: true,
    });
  });

  return rows;
};

export const collapsiblePaths = (
  categories: Category[],
  stats: Record<string, FolderStats>,
): string[] => {
  const parents = new Set(categories.map((category) => category.parent).filter(Boolean) as string[]);
  return categories
    .map((category) => category.path)
    .filter((path) => parents.has(path) || (stats[path]?.direct || 0) > 0);
};

export const searchedCategories = (
  categories: Category[],
  stats: Record<string, FolderStats>,
  namedFolders: string[],
): Category[] => {
  const byPath = new Map(categories.map((category) => [category.path, category]));
  const named = new Set(namedFolders);
  const keep = new Set<string>();

  categories.forEach((category) => {
    if (!named.has(category.path) && !(stats[category.path]?.total > 0)) return;
    for (let at: Category | undefined = category; at && !keep.has(at.path); at = byPath.get(at.parent || "")) {
      keep.add(at.path);
    }
  });

  return categories.filter((category) => keep.has(category.path));
};
