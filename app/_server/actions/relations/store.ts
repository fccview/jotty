import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { DATA_DIR } from "@/app/_consts/files";
import {
  RELATIONS_DB_NAME,
  RELATIONS_SCHEMA_VERSION,
  RelationsStatus,
} from "@/app/_consts/relations";

declare global {
  var __jottyRelations: { db: DatabaseSync; file: string; schema: number } | undefined;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS items (
    uuid TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    owner TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    title_key TEXT NOT NULL,
    encrypted INTEGER NOT NULL DEFAULT 0,
    created REAL NOT NULL DEFAULT 0,
    mtime REAL NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS items_title ON items(title_key);
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
  CREATE TABLE IF NOT EXISTS bindings (
    src TEXT NOT NULL,
    text TEXT NOT NULL,
    dst TEXT NOT NULL,
    PRIMARY KEY (src, text)
  );
  CREATE INDEX IF NOT EXISTS bindings_dst ON bindings(dst);
  CREATE TABLE IF NOT EXISTS clashes (
    path TEXT PRIMARY KEY,
    uuid TEXT NOT NULL,
    mtime REAL NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS clashes_uuid ON clashes(uuid);
  CREATE VIRTUAL TABLE IF NOT EXISTS texts USING fts5(
    uuid UNINDEXED,
    title,
    body,
    prose,
    extra,
    tokenize = 'unicode61 remove_diacritics 2'
  );
`;

export const relationsFile = (): string =>
  process.env.JOTTY_RELATIONS_DB ||
  path.join(process.cwd(), DATA_DIR, RELATIONS_DB_NAME);

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

const _fresh = (file: string): DatabaseSync => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
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

  _discard(file);
  return _fresh(file);
};

export const relationsDb = (): DatabaseSync => {
  const file = relationsFile();
  const held = globalThis.__jottyRelations;
  if (held?.db.isOpen && held.file === file && held.schema === RELATIONS_SCHEMA_VERSION) {
    return held.db;
  }
  if (held?.db.isOpen) held.db.close();

  const db = _open(file);
  globalThis.__jottyRelations = { db, file, schema: RELATIONS_SCHEMA_VERSION };
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
