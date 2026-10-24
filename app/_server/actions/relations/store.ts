import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { isMainThread } from "node:worker_threads";
import { DATA_DIR } from "@/app/_consts/files";
import {
  RELATIONS_DB_NAME,
  RELATIONS_SCHEMA_VERSION,
  RelationsStatus,
} from "@/app/_consts/relations";
import { clusterNode } from "@/app/_utils/env-utils";

interface HeldDb {
  db: DatabaseSync;
  file: string;
  schema: number;
  inode: number | null;
  seenAt: number;
}

declare global {
  var __jottyRelations: HeldDb | undefined;
  var __jottyRelationsGeneration: number | undefined;
}

const PRESENCE_CHECK_MS = 1_000;

export class RelationsGoneError extends Error {}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS items (
    uuid TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    owner TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    title_key TEXT NOT NULL,
    path_key TEXT NOT NULL DEFAULT '',
    file_key TEXT NOT NULL DEFAULT '',
    encrypted INTEGER NOT NULL DEFAULT 0,
    created REAL NOT NULL DEFAULT 0,
    mtime REAL NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS items_title ON items(title_key);
  CREATE INDEX IF NOT EXISTS items_file ON items(file_key);
  CREATE TABLE IF NOT EXISTS links (
    src TEXT NOT NULL,
    dst TEXT,
    dst_text TEXT,
    dst_label TEXT,
    kind TEXT NOT NULL,
    weight INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS links_src ON links(src);
  CREATE INDEX IF NOT EXISTS links_dst ON links(dst);
  CREATE INDEX IF NOT EXISTS links_text ON links(dst_text);
  CREATE TABLE IF NOT EXISTS aliases (
    uuid TEXT NOT NULL,
    key TEXT NOT NULL,
    PRIMARY KEY (uuid, key)
  );
  CREATE INDEX IF NOT EXISTS aliases_key ON aliases(key);
  CREATE TABLE IF NOT EXISTS clashes (
    path TEXT PRIMARY KEY,
    uuid TEXT NOT NULL,
    mtime REAL NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS clashes_uuid ON clashes(uuid);
  CREATE TABLE IF NOT EXISTS attachments (
    item TEXT NOT NULL,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    mtime REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (item, name)
  );
  CREATE INDEX IF NOT EXISTS attachments_mtime ON attachments(mtime);
  CREATE TABLE IF NOT EXISTS attachment_folders (
    item TEXT PRIMARY KEY,
    mtime REAL NOT NULL DEFAULT 0
  );
  CREATE VIRTUAL TABLE IF NOT EXISTS texts USING fts5(
    uuid UNINDEXED,
    title,
    body,
    prose,
    extra,
    tokenize = 'unicode61 remove_diacritics 2'
  );
`;

const relationsName = () => {
  const node = clusterNode();
  return node ? `.relations_${node}.db` : RELATIONS_DB_NAME;
};

export const relationsFile = (): string =>
  process.env.JOTTY_RELATIONS_DB ||
  path.join(process.cwd(), DATA_DIR, relationsName());

const _discard = (file: string) => {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.rmSync(`${file}${suffix}`, { force: true });
    } catch (error) {
      console.error(`Could not remove stale relations file ${file}${suffix}:`, error);
    }
  }
};

const _schemaVersion = (db: DatabaseSync): number => {
  try {
    const row = db
      .prepare("SELECT value FROM meta WHERE key = 'schema'")
      .get() as { value?: string } | undefined;
    return Number(row?.value || 0);
  } catch {
    return 0;
  }
};

const _prepare = (db: DatabaseSync) => {
  db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;");
  const check = db.prepare("PRAGMA quick_check").get() as Record<string, string>;
  if (Object.values(check)[0] !== "ok") throw new Error("relations db failed quick_check");
  db.exec(SCHEMA);
};

const _inodeOf = (file: string): number | null => {
  try {
    return fs.statSync(file).ino;
  } catch {
    return null;
  }
};

const _fresh = (file: string): DatabaseSync => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  _discard(file);
  const db = new DatabaseSync(file);
  _prepare(db);
  const setMeta = db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)");
  setMeta.run("schema", String(RELATIONS_SCHEMA_VERSION));
  setMeta.run("status", RelationsStatus.BUILDING);
  return db;
};

const _open = (file: string): DatabaseSync => {
  if (!fs.existsSync(file)) return _fresh(file);

  try {
    const db = new DatabaseSync(file);
    _prepare(db);
    if (_schemaVersion(db) === RELATIONS_SCHEMA_VERSION) return db;
    db.close();
  } catch (error) {
    console.error("Relations db unreadable, rebuilding from notes:", error);
  }

  return _fresh(file);
};

const _join = (file: string): DatabaseSync => {
  if (!fs.existsSync(file)) throw new RelationsGoneError(`Relations db ${file} is gone, waiting for a rebuild`);
  const db = new DatabaseSync(file);
  _prepare(db);
  if (_schemaVersion(db) === RELATIONS_SCHEMA_VERSION) return db;
  db.close();
  throw new RelationsGoneError(`Relations db ${file} has an older schema, waiting for a rebuild`);
};

const _stillThere = (held: HeldDb, file: string): boolean => {
  if (!held.db.isOpen || held.file !== file || held.schema !== RELATIONS_SCHEMA_VERSION) return false;
  if (Date.now() - held.seenAt < PRESENCE_CHECK_MS) return true;
  if (_inodeOf(file) !== held.inode) {
    console.warn(`Relations db ${file} was removed or replaced, reopening`);
    return false;
  }
  held.seenAt = Date.now();
  return true;
};

export const openRelationsDb = (): DatabaseSync | null =>
  globalThis.__jottyRelations?.db.isOpen ? relationsDb() : null;

export const relationsGeneration = (): number => globalThis.__jottyRelationsGeneration || 0;

export const relationsDb = (): DatabaseSync => {
  const file = relationsFile();
  const held = globalThis.__jottyRelations;
  if (held && _stillThere(held, file)) return held.db;
  if (held?.db.isOpen) held.db.close();
  globalThis.__jottyRelations = undefined;

  const db = isMainThread ? _open(file) : _join(file);
  globalThis.__jottyRelations = {
    db,
    file,
    schema: RELATIONS_SCHEMA_VERSION,
    inode: _inodeOf(file),
    seenAt: Date.now(),
  };
  globalThis.__jottyRelationsGeneration = relationsGeneration() + 1;
  return db;
};

export const closeRelationsDb = () => {
  const held = globalThis.__jottyRelations;
  if (held?.db.isOpen) held.db.close();
  globalThis.__jottyRelations = undefined;
};

export const relationsStatus = (): RelationsStatus => {
  const row = relationsDb()
    .prepare("SELECT value FROM meta WHERE key = 'status'")
    .get() as { value?: string } | undefined;
  return row?.value === RelationsStatus.READY
    ? RelationsStatus.READY
    : RelationsStatus.BUILDING;
};

export const setRelationsStatus = (status: RelationsStatus) => {
  relationsDb()
    .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('status', ?)")
    .run(status);
};

export const inTransaction = <T>(work: (db: DatabaseSync) => T): T => {
  const db = relationsDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
};
