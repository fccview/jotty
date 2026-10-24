import fs from "fs/promises";
import { readdirSync, statSync, type Stats } from "fs";
import path from "path";
import { isMainThread } from "node:worker_threads";
import { ATTACHMENTS_FOLDER } from "@/app/_consts/attachments";
import { isUuid } from "@/app/_consts/identity";
import { dataRoot } from "./paths";
import { inTransaction, relationsDb } from "./store";

export interface AttachmentRow {
  item: string;
  name: string;
  size: number;
  mtime: number;
}

export const attachmentsTree = (): string =>
  path.join(dataRoot(), ATTACHMENTS_FOLDER);

export const inAttachmentsTree = (target: string): boolean => {
  const rel = path.relative(attachmentsTree(), path.resolve(target));
  return !rel.startsWith("..") && !path.isAbsolute(rel);
};

export const attachmentFolderOf = (target: string): string | null => {
  const rel = path.relative(attachmentsTree(), path.resolve(target));
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  const item = rel.split(path.sep)[0];
  return isUuid(item) ? item : null;
};

const _statOf = async (target: string): Promise<Stats | null> =>
  isMainThread
    ? fs.stat(target).catch(() => null)
    : (statSync(target, { throwIfNoEntry: false }) ?? null);

const _namesIn = async (dir: string): Promise<{ name: string; isFile: boolean; isDir: boolean }[]> => {
  try {
    const entries = isMainThread
      ? await fs.readdir(dir, { withFileTypes: true })
      : readdirSync(dir, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      isFile: entry.isFile(),
      isDir: entry.isDirectory(),
    }));
  } catch {
    return [];
  }
};

const _scan = async (item: string): Promise<AttachmentRow[]> => {
  const folder = path.join(attachmentsTree(), item);
  const entries = (await _namesIn(folder)).filter(
    (entry) => entry.isFile && !entry.name.startsWith("."),
  );
  const rows = await Promise.all(
    entries.map(async (entry) => {
      const stats = await _statOf(path.join(folder, entry.name));
      return stats
        ? { item, name: entry.name, size: stats.size, mtime: Math.floor(stats.mtimeMs) }
        : null;
    }),
  );
  return rows.filter((row): row is AttachmentRow => row !== null);
};

const _storedMtime = (item: string): number | undefined =>
  (
    relationsDb()
      .prepare("SELECT mtime FROM attachment_folders WHERE item = ?")
      .get(item) as { mtime: number } | undefined
  )?.mtime;

const _replace = (item: string, rows: AttachmentRow[], mtime: number | null) =>
  inTransaction((db) => {
    db.prepare("DELETE FROM attachments WHERE item = ?").run(item);
    const insert = db.prepare(
      "INSERT OR REPLACE INTO attachments (item, name, name_key, size, mtime) VALUES (?, ?, ?, ?, ?)",
    );
    rows.forEach((row) => insert.run(row.item, row.name, row.name.toLowerCase(), row.size, row.mtime));
    if (mtime === null) {
      db.prepare("DELETE FROM attachment_folders WHERE item = ?").run(item);
    } else {
      db.prepare("INSERT OR REPLACE INTO attachment_folders (item, mtime) VALUES (?, ?)").run(item, mtime);
    }
  });

export const syncAttachmentFolder = async (uuid: string, force = false): Promise<boolean> => {
  if (!isUuid(uuid)) return false;
  const item = uuid.toLowerCase();
  const stats = await _statOf(path.join(attachmentsTree(), item));

  if (!stats?.isDirectory()) {
    if (_storedMtime(item) === undefined) return false;
    _replace(item, [], null);
    return true;
  }

  const mtime = Math.floor(stats.mtimeMs);
  if (!force && _storedMtime(item) === mtime) return false;

  _replace(item, await _scan(item), mtime);
  return true;
};

export const syncAttachments = async (force: boolean): Promise<number> => {
  const onDisk = (await _namesIn(attachmentsTree()))
    .filter((entry) => entry.isDir && isUuid(entry.name))
    .map((entry) => entry.name);

  let changed = 0;
  for (const item of onDisk) {
    if (await syncAttachmentFolder(item, force)) changed++;
  }

  const present = new Set(onDisk);
  const stored = relationsDb()
    .prepare("SELECT item FROM attachment_folders")
    .all() as { item: string }[];

  for (const row of stored) {
    if (present.has(row.item)) continue;
    _replace(row.item, [], null);
    changed++;
  }

  return changed;
};
