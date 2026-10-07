import path from "node:path";
import fs from "node:fs/promises";
import * as Y from "yjs";
import {
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  type Awareness,
} from "y-protocols/awareness";
import { fromBase64, toBase64 } from "lib0/buffer";
import { DATA_DIR } from "@/app/_consts/files";
import { atomicWrite } from "@/app/_server/actions/file/atomic";
import { withFileLock } from "@/app/_server/actions/lib/file-lock";
import { clusterNode } from "@/app/_utils/env-utils";

const TICK_MS = 300;
const REFRESH_MS = 2000;
const STALE_MS = 10000;
const NODE = clusterNode();
const NODE_FILE = `${NODE}.json`;
const PEER = Symbol("peer");

interface Payload {
  update: string;
  awareness: string;
}

export interface Replica {
  seeder: boolean;
  close: () => Promise<void>;
}

const rootDir = () => path.join(process.cwd(), DATA_DIR, ".replica");

const isFresh = (mtimeMs: number) => Date.now() - mtimeMs < STALE_MS;

const unlessMissing =
  <T>(fallback: T) =>
  (error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return fallback;
    throw error;
  };

const listDir = (dir: string) => fs.readdir(dir).catch(unlessMissing([] as string[]));

export const sweepReplicas = async () => {
  if (!NODE) return;
  for (const uuid of await listDir(rootDir())) {
    const dir = path.join(rootDir(), uuid);
    for (const name of await listDir(dir)) {
      const file = path.join(dir, name);
      const stat = await fs.stat(file).catch(unlessMissing(null));
      if (stat && !isFresh(stat.mtimeMs)) await fs.unlink(file).catch(unlessMissing(undefined));
    }
    await fs.rmdir(dir).catch(() => undefined);
  }
};

export const openReplica = async (
  uuid: string,
  doc: Y.Doc,
  awareness: Awareness,
  onSeeder: () => void,
): Promise<Replica | null> => {
  if (!NODE) return null;

  const dir = path.join(rootDir(), uuid);
  const mine = path.join(dir, NODE_FILE);
  const seen = new Map<string, string>();
  const peerIds = new Set<number>();
  let dirty = true;
  let written = 0;
  let closed = false;
  let timer: NodeJS.Timeout | undefined;
  let running: Promise<void> = Promise.resolve();

  doc.on("update", (_update: Uint8Array, origin: unknown) => {
    if (origin !== PEER) dirty = true;
  });
  awareness.on("update", ({ added }: { added: number[] }, origin: unknown) => {
    if (origin === PEER) added.forEach((id) => peerIds.add(id));
    else dirty = true;
  });

  const publish = async () => {
    dirty = false;
    const own = Array.from(awareness.meta.keys()).filter((id) => !peerIds.has(id));
    const payload: Payload = {
      update: toBase64(Y.encodeStateAsUpdate(doc)),
      awareness: toBase64(encodeAwarenessUpdate(awareness, own)),
    };
    await fs.mkdir(dir, { recursive: true });
    await atomicWrite(mine, JSON.stringify(payload));
    written = Date.now();
  };

  const pull = async () => {
    let peers = 0;
    for (const name of await listDir(dir)) {
      if (name === NODE_FILE || !name.endsWith(".json")) continue;
      const file = path.join(dir, name);
      const stat = await fs.stat(file).catch(unlessMissing(null));
      if (!stat || !isFresh(stat.mtimeMs)) continue;
      peers++;
      const version = `${stat.ino}:${stat.mtimeMs}`;
      if (seen.get(name) === version) continue;
      seen.set(name, version);
      const raw = await fs.readFile(file, "utf-8").catch(unlessMissing(null));
      if (!raw) continue;
      const payload = JSON.parse(raw) as Payload;
      Y.applyUpdate(doc, fromBase64(payload.update), PEER);
      applyAwarenessUpdate(awareness, fromBase64(payload.awareness), PEER);
    }
    if (!peers && !replica.seeder) {
      replica.seeder = true;
      onSeeder();
    }
  };

  const schedule = () => {
    if (!closed) timer = setTimeout(() => { running = tick(); }, TICK_MS);
  };

  const tick = async () => {
    try {
      if (dirty || Date.now() - written > REFRESH_MS) await publish();
      await pull();
    } catch (error) {
      console.error("[live] replica failed:", error);
    }
    schedule();
  };

  const replica: Replica = {
    seeder: false,
    close: async () => {
      closed = true;
      clearTimeout(timer);
      await running;
      await fs.unlink(mine).catch((error) => {
        if (error.code !== "ENOENT") console.error("[live] replica close failed:", error);
      });
    },
  };

  await fs.mkdir(rootDir(), { recursive: true });
  await withFileLock(rootDir(), async () => {
    await pull();
    await publish();
  });
  schedule();
  return replica;
};
