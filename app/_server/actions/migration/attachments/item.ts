import path from "path";
import fs from "fs/promises";
import { DATA_DIR } from "@/app/_consts/files";
import { LEGACY_DIRS, attachmentUrl } from "@/app/_consts/attachments";
import { ResidueKinds } from "@/app/_consts/attachment-migration";
import { isUuid } from "@/app/_consts/identity";
import { Modes, PermissionTypes } from "@/app/_types/enums";
import { extractYamlMetadata, splitFrontmatter } from "@/app/_utils/yaml-metadata-utils";
import { isEncrypted } from "@/app/_utils/encryption-utils";
import { serverWriteFile } from "@/app/_server/actions/file";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { isWritable } from "@/app/_server/actions/lib/read-only";
import { isLockedItem } from "@/app/_server/actions/lib/unstamped";
import { canReachFile } from "@/app/_server/actions/share/access";
import { commitNote } from "@/app/_server/actions/history/repo";
import { adoptFile, exists, fileOf, sameContent } from "@/app/_server/actions/attachments/store";
import { legacyFileOf } from "@/app/_server/actions/attachments/legacy-files";
import { LegacyRef, scanLegacy, swapRefs } from "@/app/_utils/legacy-refs";

export interface Ledger {
  rewritten: number;
  urls: number;
  linked: number;
  copied: number;
  reused: number;
  crossOwner: string[];
  residue: Map<ResidueKinds, Set<string>>;
  legacyBytes: Map<string, number>;
  touched: string[];
}

export interface JournalLine {
  path: string;
  uuid: string;
  from: string[];
  to: string[];
  at: string;
}

interface Source {
  path: string;
  owner: string;
}

const dataRoot = (): string => path.join(process.cwd(), DATA_DIR);

export const shown = (filePath: string): string =>
  path.relative(dataRoot(), filePath).split(path.sep).join("/");

export const newLedger = (): Ledger => ({
  rewritten: 0,
  urls: 0,
  linked: 0,
  copied: 0,
  reused: 0,
  crossOwner: [],
  residue: new Map(),
  legacyBytes: new Map(),
  touched: [],
});

export const note = (ledger: Ledger, kind: ResidueKinds, entry: string) => {
  const entries = ledger.residue.get(kind) ?? new Set<string>();
  entries.add(entry);
  ledger.residue.set(kind, entries);
};

const _source = async (
  ref: LegacyRef,
  item: { mode: Modes; filePath: string; owner: string },
  ledger: Ledger,
): Promise<Source | null> => {
  const where = `${shown(item.filePath)}: ${ref.url}`;
  const legacy = legacyFileOf(ref.owner, ref.kind, ref.name);
  if (!legacy) {
    note(ledger, ResidueKinds.MISSING, where);
    return null;
  }

  const stats = await fs.lstat(legacy).catch(() => null);
  if (!stats) {
    note(ledger, ResidueKinds.MISSING, where);
    return null;
  }
  if (!stats.isFile()) {
    note(ledger, ResidueKinds.NOT_FILE, where);
    return null;
  }

  if (ref.owner !== item.owner) {
    const editor = await canReachFile(item.mode, item.filePath, ref.owner, PermissionTypes.EDIT);
    if (!editor) {
      note(ledger, ResidueKinds.CROSS_OWNER, where);
      return null;
    }
    ledger.crossOwner.push(`${shown(item.filePath)} <- ${ref.owner}/${LEGACY_DIRS[ref.kind]}/${ref.name}`);
  }

  ledger.legacyBytes.set(legacy, stats.size);
  return { path: legacy, owner: ref.owner };
};

const _rehearse = async (uuid: string, source: string, name: string, ledger: Ledger) => {
  const target = fileOf(uuid, name);
  if (target && (await exists(target)) && (await sameContent(source, target))) {
    ledger.reused++;
    return;
  }
  ledger.linked++;
};

const _journal = async (line: JournalLine, journalPath: string) => {
  await fs.mkdir(path.dirname(journalPath), { recursive: true });
  await fs.appendFile(journalPath, `${JSON.stringify(line)}\n`, "utf-8");
};

const _history = async (owner: string, filePath: string, title: string) => {
  const relative = path.relative(path.join(dataRoot(), Modes.NOTES, owner), filePath);
  try {
    await commitNote(owner, relative, "attachments", title);
  } catch (error) {
    console.warn(`Could not record moved attachments in history for ${filePath}:`, error);
  }
};

const _refused = async (
  raw: string,
  filePath: string,
  ledger: Ledger,
  claims: Map<string, number>,
): Promise<string | null> => {
  const { metadata } = extractYamlMetadata(raw);
  const { body } = splitFrontmatter(raw);
  const where = shown(filePath);

  if (metadata.encrypted === true || isEncrypted(body)) {
    note(ledger, ResidueKinds.ENCRYPTED, where);
    return null;
  }

  const uuid = typeof metadata.uuid === "string" ? metadata.uuid : "";
  if (!isUuid(uuid) || (await isLockedItem(uuid, filePath))) {
    note(ledger, ResidueKinds.LOCKED, where);
    return null;
  }
  if (!(await isWritable(path.dirname(filePath)))) {
    note(ledger, ResidueKinds.READ_ONLY, where);
    return null;
  }
  if ((claims.get(uuid) || 0) > 1) {
    note(ledger, ResidueKinds.CLASH, where);
    return null;
  }

  return uuid;
};

const _settle = async (
  filePath: string,
  mode: Modes,
  owner: string,
  origins: string[],
  dryRun: boolean,
  ledger: Ledger,
  journalPath: string,
  expected: string | null,
  claims: Map<string, number>,
): Promise<boolean> => {
  const raw = await fs.readFile(filePath, "utf-8").catch(() => null);
  if (raw === null) return false;

  const uuid = await _refused(raw, filePath, ledger, claims);
  if (!uuid) return false;
  if (expected && uuid !== expected) {
    note(ledger, ResidueKinds.CHANGING, shown(filePath));
    return false;
  }

  const { prefix, body } = splitFrontmatter(raw);
  const scan = scanLegacy(body, origins);
  if (!scan) {
    note(ledger, ResidueKinds.UNPARSABLE, shown(filePath));
    return false;
  }
  scan.foreign.forEach((url) => note(ledger, ResidueKinds.FOREIGN, `${shown(filePath)}: ${url}`));
  scan.loose.forEach((url) => note(ledger, ResidueKinds.LOOSE, `${shown(filePath)}: ${url}`));
  if (!scan.refs.length) return false;

  const item = { mode, filePath, owner };
  const placed = new Map<string, string>();
  const swaps: { ref: LegacyRef; url: string }[] = [];

  for (const ref of scan.refs) {
    const key = `${ref.kind}/${ref.owner}/${ref.name}`;

    if (!placed.has(key)) {
      const source = await _source(ref, item, ledger);
      if (!source) continue;

      if (dryRun) {
        await _rehearse(uuid, source.path, ref.name, ledger);
        placed.set(key, ref.name);
      } else {
        const placement = await adoptFile(source.path, uuid, ref.name);
        if (placement.reused) ledger.reused++;
        else if (placement.copied) ledger.copied++;
        else ledger.linked++;
        placed.set(key, placement.name);
      }
    }

    swaps.push({ ref, url: attachmentUrl(uuid, placed.get(key)!) });
  }

  if (!swaps.length) return false;
  ledger.urls += swaps.length;
  ledger.rewritten++;
  ledger.touched.push(shown(filePath));
  if (dryRun) return true;

  await serverWriteFile(filePath, prefix + swapRefs(body, swaps));
  await _journal(
    {
      path: shown(filePath),
      uuid,
      from: swaps.map((swap) => swap.ref.url),
      to: swaps.map((swap) => swap.url),
      at: new Date().toISOString(),
    },
    journalPath,
  );

  if (mode === Modes.NOTES) {
    const title = extractYamlMetadata(raw).metadata.title;
    await _history(owner, filePath, typeof title === "string" ? title : path.basename(filePath, ".md"));
  }

  return true;
};

export const settleItem = async (
  filePath: string,
  origins: string[],
  dryRun: boolean,
  ledger: Ledger,
  journalPath: string,
  claims: Map<string, number>,
): Promise<boolean> => {
  const [mode, owner] = shown(filePath).split("/") as [Modes, string];
  if (dryRun) return _settle(filePath, mode, owner, origins, true, ledger, journalPath, null, claims);

  const raw = await fs.readFile(filePath, "utf-8").catch(() => null);
  const stored = raw ? extractYamlMetadata(raw).metadata.uuid : null;
  const laneUuid = typeof stored === "string" && isUuid(stored) ? stored : null;
  if (!laneUuid) return _settle(filePath, mode, owner, origins, true, ledger, journalPath, null, claims);

  return runQueued(itemLane(mode, laneUuid), () =>
    _settle(filePath, mode, owner, origins, false, ledger, journalPath, laneUuid, claims),
  );
};
