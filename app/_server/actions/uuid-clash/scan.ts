import path from "path";
import fs from "fs/promises";
import { CHECKLISTS_DIR, NOTES_DIR } from "@/app/_consts/files";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { boxedShell } from "@/app/_utils/shell-utils";
import { extractYamlMetadata, toIso } from "@/app/_utils/yaml-metadata-utils";
import { titleOf } from "@/app/_utils/title-utils";
import { rankClaims } from "@/app/_server/actions/lib/uuid-keeper";

const UUID_LINES = 'grep -rE --include="*.md" --exclude-dir=.git "^uuid:[[:space:]]*[^[:space:]]" -- "$1" 2>/dev/null || true';
const UUID_MARK = ":uuid:";
const SCAN_BUFFER = 10 * 1024 * 1024;

export interface ItemRoot {
  type: ItemTypes;
  mode: Modes;
  dir: string;
}

export interface ClashFile {
  type: ItemTypes;
  path: string;
  title: string;
  createdAt?: string;
  keeps: boolean;
}

export interface UuidClash {
  uuid: string;
  owner: string;
  files: ClashFile[];
}

interface Claim {
  root: ItemRoot;
  filePath: string;
}

export const itemRoots = (owner: string): ItemRoot[] => [
  { type: ItemTypes.NOTE, mode: Modes.NOTES, dir: path.join(process.cwd(), NOTES_DIR(owner)) },
  { type: ItemTypes.CHECKLIST, mode: Modes.CHECKLISTS, dir: path.join(process.cwd(), CHECKLISTS_DIR(owner)) },
];

export const shownPath = (root: ItemRoot, filePath: string): string =>
  [root.mode, ...path.relative(root.dir, filePath).split(path.sep)].join("/");

const _claimsIn = async (root: ItemRoot): Promise<Array<[string, Claim]>> => {
  const out = await boxedShell(UUID_LINES, [root.dir], { maxBuffer: SCAN_BUFFER }).catch((error) => {
    console.error(`Duplicate uuid scan could not read ${root.dir}:`, error);
    return "";
  });
  return out
    .split("\n")
    .filter((line) => line.includes(UUID_MARK))
    .map((line): [string, Claim] => {
      const cut = line.lastIndexOf(UUID_MARK);
      const uuid = line.slice(cut + UUID_MARK.length).trim().replace(/^["']|["']$/g, "").toLowerCase();
      return [uuid, { root, filePath: line.slice(0, cut) }];
    });
};

const _readClaim = async (claim: Claim) => {
  try {
    return extractYamlMetadata(await fs.readFile(claim.filePath, "utf-8"));
  } catch (error) {
    console.warn(`Duplicate uuid scan could not read ${claim.filePath}:`, error);
    return null;
  }
};

const _createdOf = (raw: unknown): string | undefined =>
  raw instanceof Date || typeof raw === "string" ? toIso(raw) : undefined;

const _confirmed = async (uuid: string, owner: string, claims: Claim[]): Promise<UuidClash | null> => {
  const read = await Promise.all(claims.map(_readClaim));
  const real = claims
    .map((claim, index) => ({ claim, parsed: read[index] }))
    .filter(({ parsed }) => String(parsed?.metadata.uuid || "").toLowerCase() === uuid);
  if (real.length < 2) return null;

  const ranked = rankClaims(real.map(({ claim }) => claim.filePath));
  const byPath = new Map(real.map((entry) => [path.resolve(entry.claim.filePath), entry]));
  return {
    uuid,
    owner,
    files: ranked.map((filePath, index) => {
      const { claim, parsed } = byPath.get(filePath)!;
      return {
        type: claim.root.type,
        path: shownPath(claim.root, filePath),
        title: titleOf(parsed?.metadata, parsed?.contentWithoutMetadata || "", path.basename(filePath, ".md")),
        createdAt: _createdOf(parsed?.metadata.createdAt),
        keeps: index === 0,
      };
    }),
  };
};

export const findClashes = async (owner: string): Promise<UuidClash[]> => {
  const claims = (await Promise.all(itemRoots(owner).map(_claimsIn))).flat();
  const grouped = new Map<string, Claim[]>();
  claims.forEach(([uuid, claim]) => grouped.set(uuid, [...(grouped.get(uuid) || []), claim]));

  const suspects = Array.from(grouped).filter(([, group]) => group.length > 1);
  const found = await Promise.all(suspects.map(([uuid, group]) => _confirmed(uuid, owner, group)));
  return found.filter((clash): clash is UuidClash => clash !== null);
};
