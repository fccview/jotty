import fs from "fs/promises";
import { readFileSync, readdirSync, statSync, type Stats } from "fs";
import path from "path";
import { isMainThread } from "node:worker_threads";
import { RelationsStatus, STALE_READ_RETRIES, ShiftKinds } from "@/app/_consts/relations";
import { getAllFileStats } from "@/app/_server/actions/file";
import { forgetItemFile, forgetItemTree, indexItemFile, treePrefix } from "./indexer";
import { itemFileInfo, itemTreeRoots } from "./paths";
import {
  attachmentFolderOf,
  inAttachmentsTree,
  syncAttachmentFolder,
  syncAttachments,
} from "./attachments";
import {
  RelationsGoneError,
  relationsDb,
  relationsGeneration,
  relationsStatus,
  setRelationsStatus,
} from "./store";

export type Shift =
  | { kind: ShiftKinds.RECONCILE; force: boolean }
  | { kind: ShiftKinds.REFRESH; targets: string[] }
  | { kind: ShiftKinds.OWNER; owner: string }
  | { kind: ShiftKinds.TREE; to: string; from: string };

export interface ShiftResult {
  changed: number;
  announce: boolean;
}

const MARKDOWN = ".md";

const _statOf = async (filePath: string): Promise<Stats | null> =>
  isMainThread
    ? fs.stat(filePath).catch(() => null)
    : (statSync(filePath, { throwIfNoEntry: false }) ?? null);

const _textOf = async (filePath: string): Promise<string> =>
  isMainThread ? fs.readFile(filePath, "utf-8") : readFileSync(filePath, "utf-8");

const _mtimesUnder = async (root: string): Promise<Map<string, number>> => {
  const found = new Map<string, number>();
  if (isMainThread) {
    (await getAllFileStats(root)).forEach((entry, filePath) => found.set(filePath, entry.mtime.getTime()));
    return found;
  }
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) return found;
  (readdirSync(root, { recursive: true }) as string[]).forEach((name) => {
    if (!name.endsWith(MARKDOWN)) return;
    const filePath = path.join(root, name);
    const stats = statSync(filePath, { throwIfNoEntry: false });
    if (stats?.isFile()) found.set(filePath, stats.mtime.getTime());
  });
  return found;
};

const _fingerprint = async (filePath: string): Promise<string | null> => {
  const stats = await _statOf(filePath);
  return stats ? `${stats.mtimeMs}:${stats.size}` : null;
};

const _indexFromDisk = async (filePath: string) => {
  try {
    for (let attempt = 0; attempt < STALE_READ_RETRIES; attempt++) {
      const stats = await _statOf(filePath);
      if (!stats) return;
      const content = await _textOf(filePath);
      indexItemFile(filePath, content, Math.floor(stats.mtimeMs));
      if ((await _fingerprint(filePath)) === `${stats.mtimeMs}:${stats.size}`) return;
    }
    console.warn(`Relations kept losing the race on ${filePath}, the next sweep will catch it`);
  } catch (error) {
    if (error instanceof RelationsGoneError) throw error;
    console.error(`Relations could not index ${filePath}:`, error);
  }
};

export const indexItemTree = async (dir: string) => {
  const mtimes = await _mtimesUnder(dir);
  for (const filePath of Array.from(mtimes.keys())) {
    if (itemFileInfo(filePath)) await _indexFromDisk(filePath);
  }
};

export const forgetMissing = async (dir: string) => {
  const prefix = treePrefix(dir);
  const rows = relationsDb()
    .prepare("SELECT path FROM items WHERE substr(path, 1, length(?1)) = ?1")
    .all(prefix) as { path: string }[];
  for (const row of rows) {
    if (!(await _statOf(row.path))) forgetItemFile(row.path);
  }
};

const _indexedMtimes = (): Map<string, number> => {
  const rows = relationsDb()
    .prepare("SELECT path, mtime FROM items UNION ALL SELECT path, mtime FROM clashes")
    .all() as { path: string; mtime: number }[];
  return new Map(rows.map((row) => [row.path, row.mtime]));
};

const _indexedMtime = (absPath: string): number | undefined =>
  (
    relationsDb()
      .prepare("SELECT mtime FROM items WHERE path = ?1 UNION ALL SELECT mtime FROM clashes WHERE path = ?1")
      .get(absPath) as { mtime: number } | undefined
  )?.mtime;

const _reconcile = async (force: boolean): Promise<ShiftResult> => {
  const wasBuilding = relationsStatus() === RelationsStatus.BUILDING;
  const generation = relationsGeneration();
  const indexed = _indexedMtimes();
  const onDisk = new Map<string, number>();

  for (const root of itemTreeRoots()) {
    (await _mtimesUnder(root)).forEach((mtime, filePath) => {
      if (itemFileInfo(filePath)) onDisk.set(path.resolve(filePath), mtime);
    });
  }

  let changed = 0;
  for (const [filePath, mtime] of Array.from(onDisk)) {
    if (!force && indexed.get(filePath) === mtime) continue;
    await _indexFromDisk(filePath);
    changed++;
  }

  for (const filePath of Array.from(indexed.keys())) {
    if (onDisk.has(filePath)) continue;
    forgetItemFile(filePath);
    changed++;
  }

  changed += await syncAttachments(force);

  if (relationsGeneration() !== generation) {
    throw new RelationsGoneError("Relations db was replaced mid-sweep, leaving it to the next rebuild");
  }
  setRelationsStatus(RelationsStatus.READY);
  return { changed, announce: wasBuilding || changed > 0 };
};

const _refreshPath = async (target: string): Promise<boolean> => {
  const absPath = path.resolve(target);
  const attachmentFolder = attachmentFolderOf(absPath);
  if (attachmentFolder) return syncAttachmentFolder(attachmentFolder);
  if (inAttachmentsTree(absPath)) return false;
  const stats = await _statOf(absPath);

  if (!stats) {
    if (_indexedMtime(absPath) !== undefined) {
      forgetItemFile(absPath);
      return true;
    }
    return forgetItemTree(absPath) > 0;
  }

  if (stats.isDirectory()) {
    await indexItemTree(absPath);
    await forgetMissing(absPath);
    return true;
  }

  if (!itemFileInfo(absPath)) return false;
  if (_indexedMtime(absPath) === Math.floor(stats.mtimeMs)) return false;
  await _indexFromDisk(absPath);
  return true;
};

const _refresh = async (targets: string[]): Promise<ShiftResult> => {
  let changed = 0;
  for (const target of targets) {
    try {
      if (await _refreshPath(target)) changed++;
    } catch (error) {
      if (error instanceof RelationsGoneError) throw error;
      console.error(`Relations could not refresh ${target}:`, error);
    }
  }
  return { changed, announce: changed > 0 };
};

const _owner = async (owner: string): Promise<ShiftResult> => {
  const dirs = itemTreeRoots().map((root) => path.join(root, owner));
  for (const dir of dirs) {
    await indexItemTree(dir);
    await forgetMissing(dir);
  }
  return { changed: dirs.length, announce: true };
};

const _tree = async (to: string, from: string): Promise<ShiftResult> => {
  await indexItemTree(to);
  await forgetMissing(from);
  return { changed: 0, announce: false };
};

export const workShift = (shift: Shift): Promise<ShiftResult> => {
  switch (shift.kind) {
    case ShiftKinds.RECONCILE:
      return _reconcile(shift.force);
    case ShiftKinds.REFRESH:
      return _refresh(shift.targets);
    case ShiftKinds.OWNER:
      return _owner(shift.owner);
    case ShiftKinds.TREE:
      return _tree(shift.to, shift.from);
  }
};
