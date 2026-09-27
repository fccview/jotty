import fs from "fs/promises";
import path from "path";
import type { DatabaseSync } from "node:sqlite";
import { LinkKinds, RelationsStatus } from "@/app/_consts/relations";
import { ItemTypes } from "@/app/_types/enums";
import { isUuid } from "@/app/_consts/identity";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { isEncrypted } from "@/app/_utils/encryption-utils";
import { singleFlight } from "@/app/_server/actions/lib/concurrency";
import { pathUuid } from "@/app/_server/actions/lib/read-only";
import { getAllFileStats } from "@/app/_server/actions/file";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { readLinks, titleKey } from "./parser";
import { itemFileInfo, itemTreeRoots } from "./paths";
import {
  inTransaction,
  relationsDb,
  relationsStatus,
  setRelationsStatus,
} from "./store";

const RELATIONS_ACTOR = "system";
const RECONCILE_EVERY_MS = 60_000;

const _origins = (): string[] => {
  try {
    return process.env.APP_URL ? [new URL(process.env.APP_URL).origin] : [];
  } catch {
    return [];
  }
};

const _tally = (keys: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  keys.forEach((key) => counts.set(key, (counts.get(key) || 0) + 1));
  return counts;
};

const _prefixOf = (dir: string): string =>
  path.resolve(dir).replace(/[\\/]+$/, "") + path.sep;

const _createdAt = (metadata: Record<string, unknown>, mtime: number): number => {
  const raw = metadata.createdAt;
  const stamp =
    raw instanceof Date ? raw.getTime() : typeof raw === "string" ? Date.parse(raw) : NaN;
  return Number.isFinite(stamp) ? stamp : mtime;
};

const _wikiLabels = (wikis: string[]): Map<string, string> => {
  const labels = new Map<string, string>();
  wikis.forEach((label) => {
    const key = titleKey(label);
    if (key && !labels.has(key)) labels.set(key, label);
  });
  return labels;
};

const _byTitle = (db: DatabaseSync, owner: string, key: string, exclude = ""): string | null => {
  const row = db
    .prepare(
      `SELECT uuid FROM items WHERE owner = ? AND title_key = ? AND uuid <> ?
       ORDER BY created ASC, uuid ASC LIMIT 1`,
    )
    .get(owner, key, exclude) as { uuid?: string } | undefined;
  return row?.uuid || null;
};

const _bind = (db: DatabaseSync, src: string, text: string, dst: string) =>
  db
    .prepare(
      `INSERT INTO bindings (src, text, dst) VALUES (?, ?, ?)
       ON CONFLICT(src, text) DO UPDATE SET dst = excluded.dst`,
    )
    .run(src, text, dst);

const _resolveWiki = (db: DatabaseSync, src: string, owner: string, text: string): string | null => {
  const bound = db
    .prepare(
      `SELECT b.dst AS dst FROM bindings b JOIN items i ON i.uuid = b.dst
       WHERE b.src = ? AND b.text = ?`,
    )
    .get(src, text) as { dst?: string } | undefined;
  if (bound?.dst) return bound.dst;

  const found = _byTitle(db, owner, text, src);
  if (found) _bind(db, src, text, found);
  return found;
};

const _adoptOrphans = (db: DatabaseSync, owner: string, uuid: string, key: string) => {
  if (_byTitle(db, owner, key) !== uuid) return;
  const orphans = db
    .prepare(
      `SELECT DISTINCT src FROM links WHERE kind = ? AND dst IS NULL AND dst_text = ?
       AND src IN (SELECT uuid FROM items WHERE owner = ?)`,
    )
    .all(LinkKinds.WIKI, key, owner) as { src: string }[];
  const adopt = db.prepare("UPDATE links SET dst = ? WHERE kind = ? AND dst IS NULL AND dst_text = ? AND src = ?");
  orphans.forEach(({ src }) => {
    if (src === uuid) return;
    adopt.run(uuid, LinkKinds.WIKI, key, src);
    _bind(db, src, key, uuid);
  });
};

const _releaseTargets = (db: DatabaseSync, uuids: string[]) => {
  const lost = db.prepare(
    `SELECT DISTINCT l.src AS src, l.dst_text AS text, i.owner AS owner
     FROM links l JOIN items i ON i.uuid = l.src WHERE l.kind = ? AND l.dst = ?`,
  );
  const release = db.prepare("UPDATE links SET dst = NULL WHERE kind = ? AND dst = ?");
  const unbind = db.prepare("DELETE FROM bindings WHERE dst = ?");
  const rebind = db.prepare("UPDATE links SET dst = ? WHERE kind = ? AND src = ? AND dst_text = ?");
  uuids.forEach((uuid) => {
    const rows = lost.all(LinkKinds.WIKI, uuid) as { src: string; text: string; owner: string }[];
    release.run(LinkKinds.WIKI, uuid);
    unbind.run(uuid);
    rows.forEach(({ src, text, owner }) => {
      const next = _resolveWiki(db, src, owner, text);
      if (next) rebind.run(next, LinkKinds.WIKI, src, text);
    });
  });
};

export const indexItemFile = (
  filePath: string,
  content: string,
  mtime: number,
): string | null => {
  const info = itemFileInfo(filePath);
  if (!info) return null;

  const absPath = path.resolve(filePath);
  const { metadata, contentWithoutMetadata } = extractYamlMetadata(content);
  const uuid =
    typeof metadata.uuid === "string" ? metadata.uuid.toLowerCase() : pathUuid(absPath);
  if (!isUuid(uuid)) return null;

  const title =
    typeof metadata.title === "string" && metadata.title.trim()
      ? metadata.title.trim()
      : path.basename(absPath, ".md");
  const key = titleKey(title);
  const encrypted = metadata.encrypted === true || isEncrypted(contentWithoutMetadata);
  const parsed = encrypted
    ? { targets: [], wikis: [], text: "" }
    : readLinks(contentWithoutMetadata, _origins());

  const mentions = _tally(
    parsed.targets
      .map((target) => target.uuid)
      .filter((dst): dst is string => Boolean(dst) && dst !== uuid),
  );
  const wikiLabels = _wikiLabels(parsed.wikis);
  const wikis = _tally(parsed.wikis.map(titleKey).filter(Boolean));

  inTransaction((db) => {
    const displaced = db
      .prepare("SELECT uuid FROM items WHERE path = ? AND uuid <> ?")
      .all(absPath, uuid) as { uuid: string }[];
    displaced.forEach((row) => _forgetUuid(db, row.uuid));

    db.prepare(
      `INSERT INTO items (uuid, path, owner, type, title, title_key, encrypted, created, mtime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET path = excluded.path, owner = excluded.owner,
         type = excluded.type, title = excluded.title, title_key = excluded.title_key,
         encrypted = excluded.encrypted, created = excluded.created, mtime = excluded.mtime`,
    ).run(
      uuid,
      absPath,
      info.owner,
      info.type,
      title,
      key,
      encrypted ? 1 : 0,
      _createdAt(metadata, mtime),
      mtime,
    );

    db.prepare("DELETE FROM links WHERE src = ?").run(uuid);
    const insert = db.prepare(
      "INSERT INTO links (src, dst, dst_text, dst_label, kind, weight) VALUES (?, ?, ?, ?, ?, ?)",
    );
    mentions.forEach((weight, dst) =>
      insert.run(uuid, dst, null, null, LinkKinds.MENTION, weight),
    );
    wikis.forEach((weight, text) => {
      const dst = _resolveWiki(db, uuid, info.owner, text);
      insert.run(uuid, dst, text, wikiLabels.get(text) || text, LinkKinds.WIKI, weight);
    });

    _adoptOrphans(db, info.owner, uuid, key);

    db.prepare("DELETE FROM texts WHERE uuid = ?").run(uuid);
    if (parsed.text && info.type === ItemTypes.NOTE) {
      db.prepare("INSERT INTO texts (uuid, body) VALUES (?, ?)").run(uuid, parsed.text);
    }
  });

  return uuid;
};

const _forgetUuid = (db: DatabaseSync, uuid: string) => {
  db.prepare("DELETE FROM links WHERE src = ?").run(uuid);
  db.prepare("DELETE FROM bindings WHERE src = ?").run(uuid);
  db.prepare("DELETE FROM texts WHERE uuid = ?").run(uuid);
  db.prepare("DELETE FROM items WHERE uuid = ?").run(uuid);
  _releaseTargets(db, [uuid]);
};

const _forgetWhere = (where: string, value: string) => {
  inTransaction((db) => {
    const rows = db.prepare(`SELECT uuid FROM items WHERE ${where}`).all(value) as {
      uuid: string;
    }[];
    rows.forEach((row) => _forgetUuid(db, row.uuid));
  });
};

export const forgetItemFile = (filePath: string) =>
  _forgetWhere("path = ?", path.resolve(filePath));

export const forgetItemTree = (dir: string) => {
  const prefix = _prefixOf(dir);
  _forgetWhere("substr(path, 1, length(?1)) = ?1", prefix);
};

const _indexFromDisk = async (filePath: string, mtime?: number) => {
  try {
    const [content, stats] = await Promise.all([
      fs.readFile(filePath, "utf-8"),
      mtime === undefined ? fs.stat(filePath) : Promise.resolve(null),
    ]);
    indexItemFile(filePath, content, mtime ?? Math.floor(stats!.mtimeMs));
  } catch (error) {
    console.error(`Relations could not index ${filePath}:`, error);
  }
};

export const indexItemTree = async (dir: string) => {
  const stats = await getAllFileStats(dir);
  for (const [filePath, entry] of Array.from(stats)) {
    if (itemFileInfo(filePath)) await _indexFromDisk(filePath, entry.mtime.getTime());
  }
};

const _indexedMtimes = (): Map<string, number> => {
  const rows = relationsDb().prepare("SELECT path, mtime FROM items").all() as {
    path: string;
    mtime: number;
  }[];
  return new Map(rows.map((row) => [row.path, row.mtime]));
};

const _reconcile = async (force = false): Promise<number> => {
  const wasBuilding = relationsStatus() === RelationsStatus.BUILDING;
  const indexed = _indexedMtimes();
  const onDisk = new Map<string, number>();

  for (const root of itemTreeRoots()) {
    const stats = await getAllFileStats(root);
    stats.forEach((entry, filePath) => {
      if (itemFileInfo(filePath)) onDisk.set(path.resolve(filePath), entry.mtime.getTime());
    });
  }

  let changed = 0;
  for (const [filePath, mtime] of Array.from(onDisk)) {
    if (!force && indexed.get(filePath) === mtime) continue;
    await _indexFromDisk(filePath, mtime);
    changed++;
  }

  for (const filePath of Array.from(indexed.keys())) {
    if (onDisk.has(filePath)) continue;
    forgetItemFile(filePath);
    changed++;
  }

  setRelationsStatus(RelationsStatus.READY);

  if (wasBuilding || changed > 0) {
    await broadcast({ type: "relations", action: "updated", username: RELATIONS_ACTOR });
  }

  return changed;
};

const _statOf = (target: string) => fs.stat(target).catch(() => null);

const _refreshPath = async (target: string, indexed: Map<string, number>): Promise<boolean> => {
  const absPath = path.resolve(target);
  const stats = await _statOf(absPath);

  if (!stats) {
    if (indexed.has(absPath)) {
      forgetItemFile(absPath);
      return true;
    }
    const before = indexed.size;
    forgetItemTree(absPath);
    return _indexedMtimes().size !== before;
  }

  if (stats.isDirectory()) {
    await indexItemTree(absPath);
    await forgetMissing(absPath);
    return true;
  }

  if (!itemFileInfo(absPath)) return false;
  const mtime = Math.floor(stats.mtimeMs);
  if (indexed.get(absPath) === mtime) return false;
  await _indexFromDisk(absPath, mtime);
  return true;
};

export const refreshItemPaths = async (targets: string[]): Promise<number> => {
  const indexed = _indexedMtimes();
  let changed = 0;
  for (const target of targets) {
    try {
      if (await _refreshPath(target, indexed)) changed++;
    } catch (error) {
      console.error(`Relations could not refresh ${target}:`, error);
    }
  }
  if (changed > 0) {
    await broadcast({ type: "relations", action: "updated", username: RELATIONS_ACTOR });
  }
  return changed;
};

export const reconcileRelations = (force = false): Promise<number> =>
  singleFlight(`relations:reconcile:${force}`, async () => {
    try {
      return await _reconcile(force);
    } catch (error) {
      console.error("Relations reconcile failed:", error);
      return 0;
    }
  });

export const rebuildRelations = async (): Promise<number> => {
  setRelationsStatus(RelationsStatus.BUILDING);
  return reconcileRelations(true);
};

export const forgetMissing = async (dir: string) => {
  const prefix = _prefixOf(dir);
  const rows = relationsDb()
    .prepare("SELECT path FROM items WHERE substr(path, 1, length(?1)) = ?1")
    .all(prefix) as { path: string }[];
  for (const row of rows) {
    const present = await fs.stat(row.path).then(
      () => true,
      () => false,
    );
    if (!present) forgetItemFile(row.path);
  }
};

export const rebuildOwnerRelations = async (owner: string): Promise<number> => {
  const dirs = itemTreeRoots().map((root) => path.join(root, owner));
  for (const dir of dirs) {
    await indexItemTree(dir);
    await forgetMissing(dir);
  }
  await broadcast({ type: "relations", action: "updated", username: owner });
  return dirs.length;
};

declare global {
  var __jottyRelationsCheckedAt: number | undefined;
}

export const ensureRelations = (): RelationsStatus => {
  const status = relationsStatus();
  const checkedAt = globalThis.__jottyRelationsCheckedAt || 0;
  const watched = Boolean(globalThis.__jottyRelationsWatch?.healthy);
  const stale = !watched && Date.now() - checkedAt > RECONCILE_EVERY_MS;
  if (status === RelationsStatus.BUILDING || stale) {
    globalThis.__jottyRelationsCheckedAt = Date.now();
    void reconcileRelations();
  }
  return status;
};
