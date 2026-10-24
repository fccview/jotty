import { Worker } from "node:worker_threads";
import {
  RECONCILE_EVERY_MS,
  RELATIONS_ACTOR,
  RelationsStatus,
  ShiftKinds,
  ShiftNotes,
} from "@/app/_consts/relations";
import { singleFlight } from "@/app/_server/actions/lib/concurrency";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { relinkLater, type Relink } from "./indexer";
import { relationsDb, relationsStatus, setRelationsStatus } from "./store";
import { workShift, type Shift, type ShiftResult } from "./sweep";

export type ShiftNote =
  | { kind: ShiftNotes.DONE; id: number; result: ShiftResult }
  | { kind: ShiftNotes.FAILED; id: number; error: string }
  | { kind: ShiftNotes.RELINK; relinks: Relink[] };

interface Job {
  shift: Shift;
  retried: boolean;
  resolve: (result: ShiftResult) => void;
  reject: (error: Error) => void;
}

interface Crew {
  worker: Worker;
  jobs: Map<number, Job>;
  next: number;
  worked: boolean;
}

declare global {
  var __jottyNightShift: Crew | undefined;
  var __jottyNightShiftBroken: boolean | undefined;
  var __jottyRelationsCheckedAt: number | undefined;
}

const SWEEPS_INLINE = process.env.NODE_ENV === "test";

const _rerun = (job: Job) => {
  const again =
    job.retried || globalThis.__jottyNightShiftBroken ? workShift(job.shift) : _clockIn(job.shift, true);
  again.then(job.resolve, job.reject);
};

const _dismiss = (crew: Crew, error: Error) => {
  if (globalThis.__jottyNightShift === crew) globalThis.__jottyNightShift = undefined;
  if (!crew.worked) globalThis.__jottyNightShiftBroken = true;
  if (crew.jobs.size) console.warn("Relations night shift left with work pending, running it again:", error.message);
  const pending = Array.from(crew.jobs.values());
  crew.jobs.clear();
  pending.forEach(_rerun);
};

const _hear = (crew: Crew, note: ShiftNote) => {
  if (note.kind === ShiftNotes.RELINK) {
    relinkLater(note.relinks);
    return;
  }
  const job = crew.jobs.get(note.id);
  if (!job) return;
  crew.jobs.delete(note.id);
  crew.worked = true;
  if (note.kind === ShiftNotes.DONE) job.resolve(note.result);
  else job.reject(new Error(note.error));
};

const _hire = (): Crew => {
  const held = globalThis.__jottyNightShift;
  if (held) return held;

  relationsDb();
  const worker = new Worker(new URL("./night-shift.worker.ts", import.meta.url));
  const crew: Crew = { worker, jobs: new Map(), next: 0, worked: false };
  worker.on("message", (note: ShiftNote) => _hear(crew, note));
  worker.on("error", (error) => {
    console.error("Relations night shift crashed:", error);
    _dismiss(crew, error);
  });
  worker.on("exit", (code) => _dismiss(crew, new Error(`Relations night shift left with code ${code}`)));
  worker.unref();
  globalThis.__jottyNightShift = crew;
  return crew;
};

const _clockIn = (shift: Shift, retried = false): Promise<ShiftResult> => {
  if (SWEEPS_INLINE || globalThis.__jottyNightShiftBroken) return workShift(shift);

  let crew: Crew;
  try {
    crew = _hire();
  } catch (error) {
    console.error("Relations night shift could not start, sweeping on the main thread:", error);
    globalThis.__jottyNightShiftBroken = true;
    return workShift(shift);
  }

  return new Promise((resolve, reject) => {
    const id = ++crew.next;
    crew.jobs.set(id, { shift, retried, resolve, reject });
    crew.worker.postMessage({ id, shift });
  });
};

const _announce = (username = RELATIONS_ACTOR) =>
  broadcast({ type: "relations", action: "updated", username });

export const reconcileRelations = (force = false): Promise<number> =>
  singleFlight(`relations:reconcile:${force}`, async () => {
    try {
      const { changed, announce } = await _clockIn({ kind: ShiftKinds.RECONCILE, force });
      if (announce) await _announce();
      return changed;
    } catch (error) {
      console.error("Relations reconcile failed:", error);
      return 0;
    }
  });

export const rebuildRelations = async (): Promise<number> => {
  setRelationsStatus(RelationsStatus.BUILDING);
  return reconcileRelations(true);
};

export const refreshItemPaths = async (targets: string[]): Promise<number> => {
  if (!targets.length) return 0;
  try {
    ensureRelations();
    const { changed, announce } = await _clockIn({ kind: ShiftKinds.REFRESH, targets });
    if (announce) await _announce();
    return changed;
  } catch (error) {
    console.error("Relations could not refresh paths:", error);
    return 0;
  }
};

export const rebuildOwnerRelations = async (owner: string): Promise<number> => {
  ensureRelations();
  const { changed } = await _clockIn({ kind: ShiftKinds.OWNER, owner });
  await _announce(owner);
  return changed;
};

export const sweepMovedTree = async (to: string, from: string): Promise<void> => {
  ensureRelations();
  await _clockIn({ kind: ShiftKinds.TREE, to, from });
};

export const refreshItems = async (uuids: string[]): Promise<number> => {
  if (!uuids.length) return 0;
  const rows = relationsDb()
    .prepare("SELECT path FROM items WHERE uuid IN (SELECT value FROM json_each(?))")
    .all(JSON.stringify(uuids.map((uuid) => uuid.toLowerCase()))) as { path: string }[];
  return refreshItemPaths(rows.map((row) => row.path));
};

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

export const settleRelations = async (): Promise<void> => {
  if (relationsStatus() === RelationsStatus.BUILDING) return;
  if (globalThis.__jottyRelationsWatch?.healthy) return;
  if (Date.now() - (globalThis.__jottyRelationsCheckedAt || 0) <= RECONCILE_EVERY_MS) return;
  globalThis.__jottyRelationsCheckedAt = Date.now();
  await reconcileRelations();
};
