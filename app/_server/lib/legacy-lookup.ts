import path from "path";
import fs from "fs/promises";
import { Modes } from "@/app/_types/enums";
import {
  ARCHIVED_DIR_NAME,
  CHECKLISTS_DIR,
  NOTES_DIR,
  USERS_FILE,
} from "@/app/_consts/files";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { User } from "@/app/_types";

const _modeDir = (mode: Modes, username: string): string =>
  path.join(
    process.cwd(),
    mode === Modes.CHECKLISTS ? CHECKLISTS_DIR(username) : NOTES_DIR(username),
  );

const _candidates = (userDir: string, category: string, id: string): string[] => {
  const paths = [
    path.join(userDir, category, `${id}.md`),
    path.join(userDir, ARCHIVED_DIR_NAME, category, `${id}.md`),
  ];

  if (category === UNCATEGORIZED) {
    paths.push(path.join(userDir, `${id}.md`));
    paths.push(path.join(userDir, ARCHIVED_DIR_NAME, `${id}.md`));
  }

  return paths;
};

const _findFile = async (
  mode: Modes,
  category: string,
  id: string,
  username: string,
): Promise<string | null> => {
  for (const candidate of _candidates(_modeDir(mode, username), category, id)) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
};

const _uuidFor = async (filePath: string): Promise<string | null> => {
  const { grepExtractField } = await import("@/app/_utils/grep-utils");
  const existing = await grepExtractField(filePath, "uuid");

  if (existing) {
    return existing;
  }

  const { generateUuid, updateYamlMetadata } =
    await import("@/app/_utils/yaml-metadata-utils");
  const { logAudit } = await import("@/app/_server/actions/log");

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const stamped = generateUuid();
    await fs.writeFile(filePath, updateYamlMetadata(content, { uuid: stamped }), "utf-8");
    return stamped;
  } catch (error) {
    await logAudit({
      level: "WARNING",
      action: "legacy_lookup",
      category: "system",
      success: false,
      errorMessage: "Failed to stamp uuid during legacy lookup",
      metadata: { filePath, error: String(error) },
    });
    return null;
  }
};

async function _logDeprecated(
  mode: Modes,
  category: string,
  id: string,
  uuid: string,
): Promise<void> {
  const { logAudit } = await import("@/app/_server/actions/log");

  await logAudit({
    level: "WARNING",
    action: "legacy_lookup",
    category: "system",
    success: true,
    errorMessage:
      "Deprecated category+id lookup used; switch to uuid, support will be removed soon",
    metadata: { mode, category, id, uuid },
  });
}

/**
 * @deprecated REST API fallback: returns the param untouched when it is a
 * uuid, otherwise resolves it as a legacy category+id pair (category from the
 * ?category= query, defaulting to Uncategorized) and logs a deprecation
 * warning. Will be removed once slug lookups are dropped.
 */
export const resolveApiId = async (
  mode: Modes,
  param: string,
  category?: string | null,
  username?: string,
): Promise<string | null> => {
  const { isUuid } = await import("@/app/_consts/identity");

  if (isUuid(param)) {
    return param;
  }

  return legacyResolve(mode, category || UNCATEGORIZED, param, username);
};

/**
 * @deprecated Resolves a legacy category+id pair to the item uuid. Only the
 * legacy URL redirect pages and the REST API fallback may use this; every call
 * is logged as a deprecation warning. Identity is uuid everywhere else.
 */
export const legacyResolve = async (
  mode: Modes,
  category: string,
  id: string,
  username?: string,
): Promise<string | null> => {
  const { readJsonFile } = await import("@/app/_server/actions/file");
  const owners: string[] = username
    ? [username]
    : ((await readJsonFile(USERS_FILE)) as User[]).map((u) => u.username);

  for (const owner of owners) {
    const filePath = await _findFile(mode, category, id, owner);

    if (!filePath) {
      continue;
    }

    const uuid = await _uuidFor(filePath);

    if (uuid) {
      await _logDeprecated(mode, category, id, uuid);
      return uuid;
    }
  }

  return null;
};
