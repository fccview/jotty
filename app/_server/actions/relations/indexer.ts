import nodeFs from "fs";
import path from "path";
import type { DatabaseSync } from "node:sqlite";
import { isMainThread, parentPort } from "node:worker_threads";
import { CHECKLIST_PIPE, LinkKinds, ShiftNotes } from "@/app/_consts/relations";
import { ItemTypes } from "@/app/_types/enums";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { titleOf } from "@/app/_utils/title-utils";
import { isEncrypted } from "@/app/_utils/encryption-utils";
import { pathUuid, uuidOf } from "@/app/_server/actions/lib/read-only";
import { rankClaims, warnClash } from "@/app/_server/actions/lib/uuid-keeper";
import { readLinks, titleKey, type LinkTarget } from "./parser";
import { appOrigins, itemFileInfo } from "./paths";
import { searchableOf } from "./searchable";
import {
  aliasKeysOf,
  fileKeyOf,
  keysOf,
  nameFor,
  pathKeyOf,
  resolveWiki,
  rewire,
  type ItemKeys,
} from "./resolve";
import { inTransaction, relationsDb } from "./store";

const _tally = (keys: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  keys.forEach((key) => counts.set(key, (counts.get(key) || 0) + 1));
  return counts;
};

interface HrefLink {
  dst: string;
  kind: LinkKinds;
  weight: number;
}

const _hrefLinks = (targets: LinkTarget[], self: string): HrefLink[] => {
  const links = new Map<string, HrefLink>();
  targets.forEach(({ uuid, kind }) => {
    if (!uuid || uuid === self) return;
    const key = `${kind}:${uuid}`;
    const link = links.get(key);
    if (link) link.weight++;
    else links.set(key, { dst: uuid, kind, weight: 1 });
  });
  return Array.from(links.values());
};

export const treePrefix = (dir: string): string =>
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

export interface Snapshot {
  keys: ItemKeys;
  sources: { src: string; text: string }[];
}

export interface Relink {
  src: string;
  path: string;
  type: ItemTypes;
  owner: string;
  from: string;
  to: string;
}

interface Indexed {
  gone: Map<string, Snapshot>;
  relinks: Relink[];
}

const _dropText = (db: DatabaseSync, uuid: string) =>
  db.prepare("DELETE FROM texts WHERE rowid = (SELECT rowid FROM items WHERE uuid = ?)").run(uuid);

const _snapshot = (db: DatabaseSync, uuid: string): Snapshot | null => {
  const row = db
    .prepare("SELECT owner, title_key, path_key FROM items WHERE uuid = ?")
    .get(uuid) as { owner: string; title_key: string; path_key: string } | undefined;
  if (!row) return null;

  const aliases = db.prepare("SELECT key FROM aliases WHERE uuid = ?").all(uuid) as { key: string }[];
  const sources = db
    .prepare("SELECT DISTINCT src, dst_text AS text FROM links WHERE kind = ? AND dst = ?")
    .all(LinkKinds.WIKI, uuid) as { src: string; text: string }[];

  return {
    keys: {
      owner: row.owner,
      titleKey: row.title_key,
      pathKey: row.path_key,
      aliases: aliases.map((alias) => alias.key),
    },
    sources,
  };
};

const _sameKeys = (a: ItemKeys, b: ItemKeys): boolean =>
  a.owner === b.owner &&
  a.titleKey === b.titleKey &&
  a.pathKey === b.pathKey &&
  [...a.aliases].sort().join("\n") === [...b.aliases].sort().join("\n");

const _renamed = (before: ItemKeys, after: ItemKeys): boolean =>
  before.owner === after.owner &&
  (before.titleKey !== after.titleKey || before.pathKey !== after.pathKey);

const _rewireAround = (db: DatabaseSync, before: ItemKeys | null, after: ItemKeys | null) => {
  if (before && after && _sameKeys(before, after)) return;
  if (before) rewire(db, before.owner, [...keysOf(before), ...(after?.owner === before.owner ? keysOf(after) : [])]);
  if (after && after.owner !== before?.owner) rewire(db, after.owner, keysOf(after));
};

const _relinksFor = (
  db: DatabaseSync,
  uuid: string,
  title: string,
  absPath: string,
  before: Snapshot,
): Relink[] => {
  const owner = before.keys.owner;
  const sourceRow = db.prepare("SELECT path, type FROM items WHERE uuid = ? AND owner = ?");
  return before.sources.flatMap(({ src, text }) => {
    if (src === uuid || resolveWiki(db, owner, text, src) === uuid) return [];
    const source = sourceRow.get(src, owner) as { path: string; type: ItemTypes } | undefined;
    const to = source ? nameFor(db, owner, uuid, title, absPath, src) : null;
    if (!source || !to) {
      if (source) console.warn(`Relations found no wikilink name that reaches ${uuid}, leaving ${source.path} alone`);
      return [];
    }
    return [{ src, path: source.path, type: source.type, owner, from: text, to }];
  });
};

const pendingRelinks = new Set<Promise<void>>();

export const relinkLater = (relinks: Relink[]) => {
  if (!relinks.length) return;
  if (!isMainThread) {
    parentPort?.postMessage({ kind: ShiftNotes.RELINK, relinks });
    return;
  }
  const work = import("./relink")
    .then(({ relinkSources }) => relinkSources(relinks))
    .catch((error) => console.error("Relations could not relink renamed wikilinks:", error))
    .finally(() => pendingRelinks.delete(work));
  pendingRelinks.add(work);
};

export const relinksSettled = async (): Promise<void> => {
  while (pendingRelinks.size) await Promise.all(Array.from(pendingRelinks));
};

const _rivalOf = (uuid: string, absPath: string): { path: string; mtime: number } | null => {
  const row = relationsDb()
    .prepare("SELECT path, mtime FROM items WHERE uuid = ? AND path <> ?")
    .get(uuid, absPath) as { path: string; mtime: number } | undefined;
  return row && nodeFs.existsSync(row.path) ? row : null;
};

const _noteClash = (db: DatabaseSync, filePath: string, uuid: string, mtime: number) =>
  db.prepare("INSERT OR REPLACE INTO clashes (path, uuid, mtime) VALUES (?, ?, ?)").run(filePath, uuid, mtime);

const _promoteClaims = (gone: Map<string, Snapshot>) => {
  if (!gone.size) return;
  const claims = relationsDb()
    .prepare("SELECT path, uuid FROM clashes WHERE uuid IN (SELECT value FROM json_each(?))")
    .all(JSON.stringify(Array.from(gone.keys()))) as { path: string; uuid: string }[];
  claims.forEach(({ path: claim, uuid }) => {
    relationsDb().prepare("DELETE FROM clashes WHERE path = ?").run(claim);
    try {
      const mtime = Math.floor(nodeFs.statSync(claim).mtimeMs);
      indexItemFile(claim, nodeFs.readFileSync(claim, "utf-8"), mtime, gone.get(uuid));
    } catch (error) {
      console.error(`Relations could not promote ${claim} after its rival went away:`, error);
    }
  });
};

export const indexItemFile = (
  filePath: string,
  content: string,
  mtime: number,
  previous?: Snapshot,
): string | null => {
  const info = itemFileInfo(filePath);
  if (!info) return null;

  const absPath = path.resolve(filePath);
  const { metadata, contentWithoutMetadata } = extractYamlMetadata(content);
  const uuid = uuidOf(metadata.uuid)?.toLowerCase() || pathUuid(absPath);

  const title = titleOf(metadata, contentWithoutMetadata, path.basename(absPath, ".md"));
  const key = titleKey(title);
  const pathKey = pathKeyOf(absPath);
  const after: ItemKeys = { owner: info.owner, titleKey: key, pathKey, aliases: aliasKeysOf(metadata) };
  const encrypted = metadata.encrypted === true || isEncrypted(contentWithoutMetadata);
  const origins = appOrigins();
  const linkable =
    info.type === ItemTypes.CHECKLIST
      ? contentWithoutMetadata.replace(CHECKLIST_PIPE, "|")
      : contentWithoutMetadata;
  const parsed = encrypted
    ? { targets: [], wikis: [], text: "", readable: "" }
    : readLinks(linkable, origins);
  const searchable = encrypted
    ? null
    : searchableOf(info.type, parsed, content, absPath, metadata, origins);

  const hrefs = _hrefLinks(parsed.targets, uuid);
  const wikiLabels = _wikiLabels(parsed.wikis);
  const wikis = _tally(parsed.wikis.map(titleKey).filter(Boolean));
  const rival = _rivalOf(uuid, absPath);
  const ranked = rival ? rankClaims([rival.path, absPath]) : [absPath];
  if (rival) warnClash(uuid, ranked);
  const loses = ranked[0] !== absPath;

  const indexed = inTransaction((db): Indexed => {
    const gone = new Map<string, Snapshot>();
    const displaced = db
      .prepare("SELECT uuid FROM items WHERE path = ? AND uuid <> ?")
      .all(absPath, uuid) as { uuid: string }[];
    displaced.forEach((row) => {
      const snapshot = _forgetUuid(db, row.uuid);
      if (snapshot) gone.set(row.uuid, snapshot);
    });

    if (loses) {
      _noteClash(db, absPath, uuid, mtime);
      return { gone, relinks: [] };
    }
    if (rival) _noteClash(db, rival.path, uuid, rival.mtime);
    db.prepare("DELETE FROM clashes WHERE path = ?").run(absPath);

    const before = previous ?? _snapshot(db, uuid);

    db.prepare(
      `INSERT INTO items (uuid, path, owner, type, title, title_key, path_key, file_key, encrypted, created, mtime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET path = excluded.path, owner = excluded.owner,
         type = excluded.type, title = excluded.title, title_key = excluded.title_key,
         path_key = excluded.path_key, file_key = excluded.file_key,
         encrypted = excluded.encrypted, created = excluded.created, mtime = excluded.mtime`,
    ).run(
      uuid,
      absPath,
      info.owner,
      info.type,
      title,
      key,
      pathKey,
      fileKeyOf(pathKey),
      encrypted ? 1 : 0,
      _createdAt(metadata, mtime),
      mtime,
    );

    db.prepare("DELETE FROM aliases WHERE uuid = ?").run(uuid);
    const alias = db.prepare("INSERT OR IGNORE INTO aliases (uuid, key) VALUES (?, ?)");
    after.aliases.forEach((aliasKey) => alias.run(uuid, aliasKey));

    db.prepare("DELETE FROM links WHERE src = ?").run(uuid);
    const insert = db.prepare(
      "INSERT INTO links (src, dst, dst_text, dst_label, kind, weight) VALUES (?, ?, ?, ?, ?, ?)",
    );
    hrefs.forEach(({ dst, kind, weight }) => insert.run(uuid, dst, null, null, kind, weight));
    wikis.forEach((weight, text) => {
      const dst = resolveWiki(db, info.owner, text, uuid);
      insert.run(uuid, dst, text, wikiLabels.get(text) || text, LinkKinds.WIKI, weight);
    });

    _rewireAround(db, before?.keys || null, after);

    _dropText(db, uuid);
    if (searchable) {
      db.prepare(
        `INSERT INTO texts (rowid, uuid, title, body, prose, extra)
         VALUES ((SELECT rowid FROM items WHERE uuid = ?1), ?1, ?, ?, ?, ?)`,
      ).run(
        uuid,
        title,
        searchable.body,
        searchable.prose,
        searchable.extra,
      );
    }

    const relinks = before && _renamed(before.keys, after) ? _relinksFor(db, uuid, title, absPath, before) : [];
    return { gone, relinks };
  });

  _promoteClaims(indexed.gone);
  relinkLater(indexed.relinks);
  return loses ? null : uuid;
};

const _forgetUuid = (db: DatabaseSync, uuid: string): Snapshot | null => {
  const snapshot = _snapshot(db, uuid);
  db.prepare("DELETE FROM links WHERE src = ?").run(uuid);
  _dropText(db, uuid);
  db.prepare("DELETE FROM aliases WHERE uuid = ?").run(uuid);
  db.prepare("DELETE FROM items WHERE uuid = ?").run(uuid);
  if (snapshot) _rewireAround(db, snapshot.keys, null);
  return snapshot;
};

const _forgetWhere = (where: string, value: string): number => {
  const forgotten = inTransaction((db) => {
    db.prepare(`DELETE FROM clashes WHERE ${where}`).run(value);
    const rows = db.prepare(`SELECT uuid FROM items WHERE ${where}`).all(value) as {
      uuid: string;
    }[];
    const gone = new Map<string, Snapshot>();
    rows.forEach((row) => {
      const snapshot = _forgetUuid(db, row.uuid);
      if (snapshot) gone.set(row.uuid, snapshot);
    });
    return { gone, count: rows.length };
  });
  _promoteClaims(forgotten.gone);
  return forgotten.count;
};

export const forgetItemFile = (filePath: string) =>
  _forgetWhere("path = ?", path.resolve(filePath));

export const forgetItemTree = (dir: string) =>
  _forgetWhere("instr(path, ?) = 1", treePrefix(dir));
