import path from "path";
import { serverReadFile, serverWriteFile } from "@/app/_server/actions/file";
import { revalidateTag } from "next/cache";
import { Modes } from "@/app/_types/enums";
import { SharingPermissions } from "@/app/_types/core";
import { DATA_DIR } from "@/app/_consts/files";
import { CATEGORY_INFO_FILE, SHARED_WITH_KEY } from "@/app/_consts/sharing";
import { parseSharedWith, toSharedWith } from "@/app/_utils/sharing-utils";
import { grepFilesByText } from "@/app/_utils/grep-utils";
import {
  extractYamlMetadata,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { mutateCatInfo } from "./category-info";
import { dropMounts } from "./mounts";

const RENAMED_MODES = [Modes.NOTES, Modes.CHECKLISTS];

type Grants = Record<string, SharingPermissions>;
type Reshape = (users: Grants) => Grants | null;

const _modeTag = (mode: Modes): string =>
  mode === Modes.CHECKLISTS ? "layout-checklists" : "layout-notes";

const _refresh = (mode: Modes): void => {
  dropMounts(mode);
  revalidateTag(_modeTag(mode), { expire: 0 });
};

const _swapKey =
  (oldName: string, newName: string): Reshape =>
  (users) => {
    const perms = users[oldName];
    if (!perms) return null;

    const next = { ...users, [newName]: perms };
    delete next[oldName];

    return next;
  };

const _dropKey =
  (username: string): Reshape =>
  (users) => {
    if (!users[username]) return null;

    const next = { ...users };
    delete next[username];

    return next;
  };

const _reshapeFiles = async (
  mode: Modes,
  username: string,
  reshape: Reshape,
): Promise<number> => {
  const modeDir = path.join(process.cwd(), DATA_DIR, mode);
  const candidates = await grepFilesByText(modeDir, username, "*.md");
  let touched = 0;

  for (const filePath of candidates) {
    try {
      const content = await serverReadFile(filePath);
      if (!content) continue;

      const { metadata } = extractYamlMetadata(content);
      const parsed = parseSharedWith(metadata[SHARED_WITH_KEY]);
      if (!parsed || parsed.optedOut) continue;

      const reshaped = reshape(parsed.users);
      if (!reshaped) continue;

      const updated = updateYamlMetadata(content, {
        [SHARED_WITH_KEY]: toSharedWith(reshaped),
      });

      await serverWriteFile(filePath, updated);
      touched += 1;
    } catch (error) {
      console.error(`Failed reshaping share in ${filePath}:`, error);
    }
  }

  return touched;
};

const _reshapeCats = async (
  mode: Modes,
  username: string,
  reshape: Reshape,
): Promise<number> => {
  const modeDir = path.join(process.cwd(), DATA_DIR, mode);
  const candidates = await grepFilesByText(modeDir, username, CATEGORY_INFO_FILE);
  let touched = 0;

  for (const infoFile of candidates) {
    const dir = path.dirname(infoFile);

    try {
      const written = await mutateCatInfo(dir, (info) => {
        if (!info.sharing?.users) return null;

        const reshaped = reshape(info.sharing.users);
        if (!reshaped) return null;

        return { ...info, sharing: { ...info.sharing, users: reshaped } };
      });

      if (written) touched += 1;
    } catch (error) {
      console.error(`Failed reshaping share in ${dir}:`, error);
    }
  }

  return touched;
};

const _reshapeGrants = async (
  username: string,
  reshape: Reshape,
): Promise<number> => {
  let touched = 0;

  for (const mode of RENAMED_MODES) {
    const perMode =
      (await _reshapeFiles(mode, username, reshape)) +
      (await _reshapeCats(mode, username, reshape));

    if (perMode > 0) _refresh(mode);

    touched += perMode;
  }

  return touched;
};

export const renameGrants = async (
  oldName: string,
  newName: string,
): Promise<number> => _reshapeGrants(oldName, _swapKey(oldName, newName));

export const revokeGrants = async (username: string): Promise<number> => {
  const touched = await _reshapeGrants(username, _dropKey(username));

  RENAMED_MODES.forEach(_refresh);

  await broadcast({ type: "sharing", action: "deleted", username });

  return touched;
};
