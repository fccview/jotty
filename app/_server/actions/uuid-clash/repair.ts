import path from "path";
import fs from "fs/promises";
import type { Result, SanitisedUser } from "@/app/_types";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { serverWriteFile } from "@/app/_server/actions/file";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { appOrigins } from "@/app/_server/actions/relations/paths";
import { titleKey } from "@/app/_server/actions/relations/parser";
import { isEncrypted } from "@/app/_utils/encryption-utils";
import { itemLinksTo, retargetLinks, unescapeLabel, type ItemLink } from "@/app/_utils/item-links";
import { extractYamlMetadata, generateUuid, splitFrontmatter } from "@/app/_utils/yaml-metadata-utils";
import { boxedShell } from "@/app/_utils/shell-utils";
import { findClashes, itemRoots, shownPath, type ClashFile, type ItemRoot } from "./scan";

export const NO_CLASH = "No duplicate for that uuid";
export const NOT_CLAIMANT = "That path does not hold the duplicated uuid";

const FILES_WITH = 'grep -rlF --include="*.md" --exclude-dir=.git -e "$1" -- "$2" 2>/dev/null || true';

export interface Rekeyed {
  path: string;
  uuid: string;
  title: string;
}

export interface ClashRepair {
  uuid: string;
  rekeyed: Rekeyed[];
  relinked: string[];
  ambiguous: string[];
  skipped: string[];
}

interface Located {
  root: ItemRoot;
  filePath: string;
}

const _modeOf = (type: ItemTypes): Modes => (type === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS);

const _locate = (owner: string, shown: string): Located | null => {
  const root = itemRoots(owner).find((candidate) => shown.startsWith(`${candidate.mode}/`));
  if (!root) return null;
  const filePath = path.resolve(root.dir, shown.slice(root.mode.length + 1));
  return shownPath(root, filePath) === shown ? { root, filePath } : null;
};

const _uuidLine = (uuid: string) => new RegExp(`^(uuid:[ \\t]*["']?)${uuid}(["']?[ \\t]*\\r?)$`, "im");

const _rekey = async (owner: string, file: ClashFile, uuid: string): Promise<Rekeyed | null> => {
  const found = _locate(owner, file.path);
  if (!found) return null;
  const fresh = generateUuid();
  return runQueued(itemLane(_modeOf(file.type), uuid), async () => {
    const { prefix, body } = splitFrontmatter(await fs.readFile(found.filePath, "utf-8"));
    const swapped = prefix.replace(_uuidLine(uuid), `$1${fresh}$2`);
    if (swapped === prefix) return null;
    await serverWriteFile(found.filePath, swapped + body);
    return { path: file.path, uuid: fresh, title: file.title };
  });
};

const _pickLinks = (links: ItemLink[], owner: Rekeyed, stays: Set<string>, rivals: Set<string>) =>
  links.filter((link) => {
    const key = titleKey(unescapeLabel(link.label));
    return key === titleKey(owner.title) && !stays.has(key) && !rivals.has(key);
  });

const _relink = async (
  located: Located,
  uuid: string,
  moved: Rekeyed[],
  stays: Set<string>,
): Promise<"relinked" | "ambiguous" | "skipped" | null> => {
  const lane = extractYamlMetadata(await fs.readFile(located.filePath, "utf-8")).metadata.uuid;
  return runQueued(itemLane(located.root.mode, String(lane || located.filePath)), async () => {
    const raw = await fs.readFile(located.filePath, "utf-8");
    const { prefix, body } = splitFrontmatter(raw);
    if (extractYamlMetadata(raw).metadata.encrypted === true || isEncrypted(body)) return "skipped";

    const links = itemLinksTo(body, uuid, appOrigins());
    if (!links.length) return null;
    let next = body;
    let taken = 0;
    moved.forEach((owner) => {
      const rivals = new Set(moved.filter((other) => other !== owner).map((other) => titleKey(other.title)));
      const mine = _pickLinks(itemLinksTo(next, uuid, appOrigins()), owner, stays, rivals);
      taken += mine.length;
      next = retargetLinks(next, mine, uuid, owner.uuid);
    });
    if (next !== body) await serverWriteFile(located.filePath, prefix + next);
    if (taken < links.length) return "ambiguous";
    return taken ? "relinked" : null;
  });
};

const _filesLinking = async (owner: string, uuid: string): Promise<Located[]> => {
  const found = await Promise.all(
    itemRoots(owner).map(async (root) => {
      const out = await boxedShell(FILES_WITH, [uuid, root.dir]).catch((error) => {
        console.error(`Duplicate uuid repair could not search ${root.dir}:`, error);
        return "";
      });
      return out.split("\n").filter(Boolean).map((filePath) => ({ root, filePath }));
    }),
  );
  return found.flat();
};

const _chosen = (files: ClashFile[], pick?: string): ClashFile[] | null => {
  if (!pick) return files.filter((file) => !file.keeps);
  const match = files.filter((file) => file.path === pick);
  return match.length ? match : null;
};

export const repairClash = async (
  actor: SanitisedUser,
  owner: string,
  uuid: string,
  pick?: string,
): Promise<Result<ClashRepair>> => {
  const target = uuid.toLowerCase();
  const clash = (await findClashes(owner)).find((entry) => entry.uuid === target);
  if (!clash) return { success: false, error: NO_CLASH };
  const chosen = _chosen(clash.files, pick);
  if (!chosen) return { success: false, error: NOT_CLAIMANT };

  const rekeyed = (await Promise.all(chosen.map((file) => _rekey(owner, file, target)))).filter(
    (entry): entry is Rekeyed => entry !== null,
  );
  const stays = new Set(
    clash.files.filter((file) => !chosen.includes(file)).map((file) => titleKey(file.title)),
  );

  const report: ClashRepair = { uuid: target, rekeyed, relinked: [], ambiguous: [], skipped: [] };
  for (const located of await _filesLinking(owner, target)) {
    const outcome = await _relink(located, target, rekeyed, stays);
    if (outcome) report[outcome].push(shownPath(located.root, located.filePath));
  }

  await broadcast({ type: "note", action: "updated", username: actor.username });
  console.info(`Duplicate uuid ${target} repaired for ${owner}:`, JSON.stringify(report));
  return { success: true, data: report };
};
