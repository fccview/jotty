import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { DATA_DIR } from "@/app/_consts/files";
import {
  ATTACHMENTS_JOURNAL,
  ATTACHMENTS_RUN_LOCK,
  LINK_PROBE_PREFIX,
  LinkModes,
  MIGRATIONS_DIR_NAME,
  MIGRATION_PASSES_MAX,
  ResidueKinds,
} from "@/app/_consts/attachment-migration";
import { Modes } from "@/app/_types/enums";
import type { AttachmentMigrationReport } from "@/app/_types";
import { withFileLock } from "@/app/_server/actions/lib/file-lock";
import { appOrigins } from "@/app/_server/actions/relations/paths";
import { attachmentsRoot } from "@/app/_server/actions/attachments/store";
import { grepUuidClaims } from "@/app/_utils/grep-utils";
import { Ledger, newLedger, note, settleItem } from "./item";
import { moveAvatars } from "./avatars";

const execFileAsync = promisify(execFile);
const LEGACY_PATTERN = "/api/(image|video|file)/";

declare global {
  var __jottyAttachmentsMigrating: boolean | undefined;
}

export class MigrationBusyError extends Error {}

const dataRoot = (): string => path.join(process.cwd(), DATA_DIR);

const _code = (error: unknown): string | undefined =>
  (error as NodeJS.ErrnoException | null)?.code;

const _isDir = async (dir: string): Promise<boolean> => {
  try {
    return (await fs.stat(dir)).isDirectory();
  } catch (error) {
    if (_code(error) === "ENOENT") return false;
    throw error;
  }
};

const _roots = async (): Promise<string[]> => {
  const roots = [Modes.NOTES, Modes.CHECKLISTS].map((mode) => path.join(dataRoot(), mode));
  const present = await Promise.all(roots.map(_isDir));
  return roots.filter((_, index) => present[index]);
};

const _candidates = async (roots: string[]): Promise<string[]> => {
  const found: string[] = [];

  for (const root of roots) {
    try {
      const { stdout } = await execFileAsync(
        "grep",
        ["-rlE", "--include=*.md", "--exclude-dir=.git", "-e", LEGACY_PATTERN, "--", root],
        { maxBuffer: 64 * 1024 * 1024 },
      );
      found.push(...stdout.split("\n").filter(Boolean));
    } catch (error) {
      const status = (error as { code?: number | string }).code;
      if (status === 1 || status === "ENOENT") continue;
      throw error;
    }
  }

  return found.sort();
};

const _writable = async (dir: string): Promise<void> => {
  await fs.mkdir(dir, { recursive: true });
  const probe = path.join(dir, `.${randomUUID()}.probe`);
  await fs.writeFile(probe, "ok");
  await fs.rm(probe, { force: true });
};

const _linkMode = async (): Promise<LinkModes> => {
  const source = path.join(dataRoot(), Modes.NOTES, `${LINK_PROBE_PREFIX}${randomUUID()}`);
  const target = path.join(attachmentsRoot(), `${LINK_PROBE_PREFIX}${randomUUID()}`);

  try {
    await fs.mkdir(path.dirname(source), { recursive: true });
    await fs.writeFile(source, "probe");
    await fs.link(source, target);
    return LinkModes.LINK;
  } catch (error) {
    console.warn("Hardlinks are not available here, attachments will be copied:", _code(error));
    return LinkModes.COPY;
  } finally {
    await fs.rm(source, { force: true });
    await fs.rm(target, { force: true });
  }
};

const _freeBytes = async (): Promise<number | null> => {
  try {
    const stats = await fs.statfs(attachmentsRoot());
    return stats.bavail * stats.bsize;
  } catch (error) {
    console.warn("Could not read free space for the attachments folder:", error);
    return null;
  }
};

export const journalPath = (): string =>
  path.join(dataRoot(), MIGRATIONS_DIR_NAME, ATTACHMENTS_JOURNAL);

const _lockPath = async (): Promise<string> => {
  const lockPath = path.join(dataRoot(), ".locks", ATTACHMENTS_RUN_LOCK);
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  await fs.appendFile(lockPath, "");
  return lockPath;
};

const _pass = async (dryRun: boolean): Promise<Ledger> => {
  const ledger = newLedger();
  const origins = appOrigins();
  const roots = await _roots();
  const candidates = await _candidates(roots);
  if (!candidates.length) return ledger;

  const claims = await grepUuidClaims(roots);
  for (const filePath of candidates) {
    await settleItem(filePath, origins, dryRun, ledger, journalPath(), claims);
  }

  return ledger;
};

const _report = (
  dryRun: boolean,
  totals: Ledger,
  last: Ledger,
  items: number,
  passes: number,
  linkMode: LinkModes,
  freeBytes: number | null,
  avatars: { moved: number; uuids: number },
): AttachmentMigrationReport => {
  const residue: AttachmentMigrationReport["residue"] = {};
  last.residue.forEach((entries, kind) => {
    residue[kind] = Array.from(entries).sort();
  });

  const legacyBytes = Array.from(totals.legacyBytes.values()).reduce((sum, size) => sum + size, 0);

  return {
    dryRun,
    items,
    rewritten: totals.rewritten,
    urls: totals.urls,
    linked: totals.linked,
    copied: totals.copied,
    reused: totals.reused,
    avatars: avatars.moved,
    uuids: avatars.uuids,
    passes,
    linkMode,
    copyBytes: linkMode === LinkModes.COPY ? legacyBytes : 0,
    freeBytes,
    crossOwner: totals.crossOwner,
    residue,
  };
};

const _merge = (into: Ledger, from: Ledger) => {
  into.rewritten += from.rewritten;
  into.urls += from.urls;
  into.linked += from.linked;
  into.copied += from.copied;
  into.reused += from.reused;
  into.crossOwner.push(...from.crossOwner);
  from.legacyBytes.forEach((size, file) => into.legacyBytes.set(file, size));
};

const _work = async (dryRun: boolean): Promise<AttachmentMigrationReport> => {
  await _writable(attachmentsRoot());
  if (!dryRun) await _writable(path.dirname(journalPath()));

  const linkMode = await _linkMode();
  const freeBytes = await _freeBytes();
  const items = (await _candidates(await _roots())).length;
  const totals = newLedger();
  let last = newLedger();
  let passes = 0;

  do {
    passes++;
    last = await _pass(dryRun);
    _merge(totals, last);
  } while (!dryRun && last.rewritten > 0 && passes < MIGRATION_PASSES_MAX);

  if (!dryRun && last.rewritten > 0) {
    last = await _pass(true);
    last.touched.forEach((entry) => note(last, ResidueKinds.CHANGING, entry));
  }

  const avatars = await moveAvatars(dryRun, last);
  return _report(dryRun, totals, last, items, passes, linkMode, freeBytes, avatars);
};

export const runAttachmentMigration = async (
  dryRun: boolean,
): Promise<AttachmentMigrationReport> => {
  if (dryRun) return _work(true);
  if (globalThis.__jottyAttachmentsMigrating) {
    throw new MigrationBusyError("The attachments migration is already running");
  }

  globalThis.__jottyAttachmentsMigrating = true;
  try {
    return await withFileLock(await _lockPath(), () => _work(false));
  } finally {
    globalThis.__jottyAttachmentsMigrating = false;
  }
};
