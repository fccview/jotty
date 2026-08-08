"use server";

import path from "path";
import fs from "fs/promises";
import simpleGit, { SimpleGit } from "simple-git";
import { lock } from "proper-lockfile";
import { NOTES_FOLDER } from "@/app/_consts/notes";
import { getCurrentUser } from "@/app/_server/actions/users";
import { canReach } from "@/app/_server/actions/share/queries";
import { PermissionTypes } from "@/app/_types/enums";
import { getSettings } from "@/app/_server/actions/config";
import { USERS_FILE } from "@/app/_consts/files";
import { readJsonFile } from "@/app/_server/actions/file";

export interface HistoryEntry {
  commitHash: string;
  date: string;
  message: string;
  action: string;
  title: string;
}

export interface HistoryVersion {
  commitHash: string;
  date: string;
  content: string;
  title: string;
}

interface HistoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type HistoryAction = "create" | "update" | "rename" | "move" | "delete";

const LEGACY_LOCK_FILE = ".historylock";
const LOCKS_DIR = ".locks";
const LOCK_STALE_MS = 30000;
const LOCK_RETRIES = {
  retries: 5,
  factor: 2,
  minTimeout: 100,
  maxTimeout: 2000,
};

const _turnstile = new Map<string, Promise<unknown>>();

const USER_NOTES_DIR = (username: string) =>
  path.join(process.cwd(), "data", NOTES_FOLDER, username);

const LOCK_PATH = (username: string) =>
  path.join(
    process.cwd(),
    "data",
    LOCKS_DIR,
    `history-${username.replace(/[^a-zA-Z0-9._-]/g, "_")}.lock`
  );

const GITIGNORE_CONTENT = `.index.json
.order.json
*.lock
.historylock
images/
files/
videos/
*.tmp
*.swp
*~`;

const _getGitInstance = (userDir: string): SimpleGit => {
  return simpleGit(userDir, {
    binary: "git",
    maxConcurrentProcesses: 1,
    trimmed: true,
  });
};

const _sweepStale = async (lockPath: string): Promise<void> => {
  const lockDir = `${lockPath}.lock`;

  try {
    const stats = await fs.stat(lockDir);
    if (Date.now() - stats.mtimeMs < LOCK_STALE_MS * 2) return;
    await fs.rm(lockDir, { recursive: true, force: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error("Failed to sweep stale history lock:", error);
    }
  }
};

const _dropLegacyLock = async (userDir: string): Promise<void> => {
  const legacy = path.join(userDir, LEGACY_LOCK_FILE);

  try {
    await fs.rm(`${legacy}.lock`, { recursive: true, force: true });
    await fs.rm(legacy, { force: true });
  } catch (error) {
    console.error("Failed to drop legacy history lock:", error);
  }
};

const gatekeeper = async <T>(
  username: string,
  errand: () => Promise<T>
): Promise<T> => {
  const lockPath = LOCK_PATH(username);
  const queued = _turnstile.get(username) ?? Promise.resolve();

  const turn = queued.catch(() => { }).then(async () => {
    await fs.mkdir(path.dirname(lockPath), { recursive: true });
    await fs.writeFile(lockPath, "", { flag: "a" });
    await _sweepStale(lockPath);

    const release = await lock(lockPath, {
      stale: LOCK_STALE_MS,
      retries: LOCK_RETRIES,
    });

    try {
      return await errand();
    } finally {
      try {
        await release();
      } catch (error) {
        console.error("Failed to release history lock:", error);
      }
    }
  });

  _turnstile.set(username, turn.catch(() => { }));

  return turn;
};

const _formatCommitMessage = (
  action: HistoryAction,
  noteTitle: string,
  metadata?: { oldTitle?: string; oldCategory?: string; newCategory?: string }
): string => {
  switch (action) {
    case "create":
      return `[create] ${noteTitle}`;
    case "update":
      return `[update] ${noteTitle}`;
    case "rename":
      return `[rename] "${metadata?.oldTitle}" -> "${noteTitle}"`;
    case "move":
      return `[move] ${noteTitle}: ${metadata?.oldCategory} -> ${metadata?.newCategory}`;
    case "delete":
      return `[delete] ${noteTitle}`;
    default:
      return `[change] ${noteTitle}`;
  }
};

const _parseCommitMessage = (
  message: string
): { action: string; title: string } => {
  const match = message.match(/^\[(\w+)\]\s*(.*)$/);
  if (match) {
    return { action: match[1], title: match[2] };
  }
  return { action: "update", title: message };
};

const _isHistoryEnabled = async (): Promise<boolean> => {
  try {
    const settings = await getSettings();
    return settings?.editor?.historyEnabled === true;
  } catch {
    return false;
  }
};

export const ensureRepo = async (username: string): Promise<void> => {
  const userDir = USER_NOTES_DIR(username);
  const gitDir = path.join(userDir, ".git");

  await _dropLegacyLock(userDir);

  try {
    await fs.access(gitDir);
  } catch {
    const git = _getGitInstance(userDir);
    await git.init();

    await git.addConfig("user.email", "history@local");
    await git.addConfig("user.name", "History");

    const gitignorePath = path.join(userDir, ".gitignore");
    await fs.writeFile(gitignorePath, GITIGNORE_CONTENT);

    await git.add(".gitignore");
    await git.commit("[init] Initialize note history");
  }
};

export const commitCategoryRename = async (
  username: string,
  oldPath: string,
  newPath: string,
): Promise<HistoryResult<string>> => {
  const enabled = await _isHistoryEnabled();
  if (!enabled) {
    return { success: false };
  }
  const userDir = USER_NOTES_DIR(username);

  try {
    await fs.access(userDir);
  } catch {
    return { success: false, error: "User directory not found" };
  }

  await ensureRepo(username);

  try {
    return await gatekeeper(username, async () => {
      const git = _getGitInstance(userDir);
      const oldPathNorm = oldPath.replace(/\\/g, "/");
      const newPathNorm = newPath.replace(/\\/g, "/");

      await git.add(["-u", oldPathNorm]);
      await git.add(newPathNorm);
      await git.commit(`[move] Category: ${oldPathNorm} -> ${newPathNorm}`);

      return { success: true };
    });
  } catch (error) {
    console.error("Git category rename error:", error);
    return { success: false, error: String(error) };
  }
};

export const commitNote = async (
  username: string,
  relativePath: string,
  action: HistoryAction,
  noteTitle: string,
  metadata?: { oldTitle?: string; oldCategory?: string; newCategory?: string; oldPath?: string }
): Promise<HistoryResult<string>> => {
  const enabled = await _isHistoryEnabled();
  if (!enabled) {
    return { success: true };
  }

  const userDir = USER_NOTES_DIR(username);

  try {
    await fs.access(userDir);
  } catch {
    return { success: false, error: "User directory not found" };
  }

  await ensureRepo(username);

  try {
    return await gatekeeper(username, async () => {
      const git = _getGitInstance(userDir);
      const message = _formatCommitMessage(action, noteTitle, metadata);

      const status = await git.status();
      const normalizedPath = relativePath.replace(/\\/g, "/");

      if (action === "delete") {
        const hasDeletedFile = status.deleted.some(
          (f) => f === normalizedPath || f.endsWith(path.basename(relativePath))
        );
        if (!hasDeletedFile) {
          return { success: true };
        }
        await git.add(["-u", relativePath]);
      } else if (action === "move" && metadata?.oldPath) {
        const oldPathNormalized = metadata.oldPath.replace(/\\/g, "/");
        const leftBehind = status.deleted.some(
          (f) => f === oldPathNormalized || f === metadata.oldPath
        );

        if (leftBehind) {
          await git.add(["-u", oldPathNormalized]);
        }

        await git.add(normalizedPath);
      } else {
        const hasChanges = status.files.some(
          (f) =>
            f.path === relativePath ||
            f.path === normalizedPath ||
            f.path.endsWith(path.basename(relativePath))
        );

        if (!hasChanges) {
          return { success: true };
        }

        await git.add(relativePath);
      }

      const result = await git.commit(message);
      return { success: true, data: result.commit };
    });
  } catch (error) {
    console.error("Git commit error:", error);
    return { success: false, error: String(error) };
  }
};

export const getHistory = async (
  noteUuid: string,
  noteOwner: string,
  page: number = 1,
  pageSize: number = 20
): Promise<HistoryResult<{ entries: HistoryEntry[]; hasMore: boolean }>> => {
  const enabled = await _isHistoryEnabled();
  if (!enabled) {
    return { success: false, error: "History is not enabled" };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  const canRead = await canReach(
    noteUuid,
    "note",
    currentUser.username,
    PermissionTypes.READ
  );

  if (!canRead) {
    return { success: false, error: "Permission denied" };
  }

  const username = noteOwner || currentUser.username;
  const userDir = USER_NOTES_DIR(username);

  try {
    await ensureRepo(username);
    const git = _getGitInstance(userDir);

    const { getNoteById } = await import("@/app/_server/actions/note");
    const note = await getNoteById(noteUuid, username);

    if (!note) {
      return { success: false, error: "Note not found" };
    }

    const filePath = path.join(
      note.category || "Uncategorized",
      `${note.id}.md`
    );

    const skip = (page - 1) * pageSize;
    const rawOutput = await git.raw([
      "log",
      "--follow",
      `--skip=${skip}`,
      `-n`,
      String(pageSize + 1),
      "--format=%H|%aI|%s",
      "--",
      filePath,
    ]);

    const lines = rawOutput
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);
    const parsedEntries = lines.map((line) => {
      const [hash, date, ...messageParts] = line.split("|");
      return {
        hash: hash || "",
        date: date || "",
        message: messageParts.join("|") || "",
      };
    });

    const hasMore = parsedEntries.length > pageSize;
    const entries: HistoryEntry[] = parsedEntries
      .slice(0, pageSize)
      .map((entry) => {
        const parsed = _parseCommitMessage(entry.message);
        return {
          commitHash: entry.hash,
          date: entry.date,
          message: entry.message,
          action: parsed.action,
          title: parsed.title,
        };
      });

    return { success: true, data: { entries, hasMore } };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

export const getVersion = async (
  noteUuid: string,
  noteOwner: string,
  commitHash: string
): Promise<HistoryResult<HistoryVersion>> => {
  const enabled = await _isHistoryEnabled();
  if (!enabled) {
    return { success: false, error: "History is not enabled" };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  if (!/^[a-f0-9]{7,40}$/i.test(commitHash)) {
    return { success: false, error: "Invalid commit hash" };
  }

  const canRead = await canReach(
    noteUuid,
    "note",
    currentUser.username,
    PermissionTypes.READ
  );

  if (!canRead) {
    return { success: false, error: "Permission denied" };
  }

  const username = noteOwner || currentUser.username;
  const userDir = USER_NOTES_DIR(username);

  try {
    const git = _getGitInstance(userDir);

    const { extractYamlMetadata } = await import(
      "@/app/_utils/yaml-metadata-utils"
    );

    let content: string | null = null;

    const filesInCommit = await git.raw([
      "ls-tree",
      "-r",
      "--name-only",
      commitHash,
    ]);

    const mdFiles = filesInCommit
      .trim()
      .split("\n")
      .filter((f) => f.endsWith(".md") && f.length > 0);

    for (const file of mdFiles) {
      try {
        const fileContent = await git.show([`${commitHash}:${file}`]);
        const { metadata } = extractYamlMetadata(fileContent);
        if (metadata.uuid === noteUuid) {
          content = fileContent;
          break;
        }
      } catch {
        continue;
      }
    }

    if (content === null) {
      const { getNoteById } = await import("@/app/_server/actions/note");
      const note = await getNoteById(noteUuid, username);

      if (note) {
        const currentPath = path.join(
          note.category || "Uncategorized",
          `${note.id}.md`
        );

        try {
          const atPath = await git.show([`${commitHash}:${currentPath}`]);
          const { metadata } = extractYamlMetadata(atPath);
          if (!metadata.uuid) content = atPath;
        } catch (error) {
          console.warn(
            "Note is not at its current path in that commit:",
            error
          );
        }
      }
    }

    if (content === null) {
      return { success: false, error: "Note version not found in commit" };
    }

    const { metadata, contentWithoutMetadata } = extractYamlMetadata(content);

    const log = await git.log({
      from: commitHash,
      to: commitHash,
      maxCount: 1,
      format: {
        date: "%aI",
      },
    });
    const commitDate = log.latest?.date || new Date().toISOString();

    return {
      success: true,
      data: {
        commitHash,
        date: commitDate,
        content: contentWithoutMetadata,
        title: metadata.title || "Untitled",
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

export const restoreNoteVersion = async (
  noteUuid: string,
  noteOwner: string,
  commitHash: string
): Promise<HistoryResult<void>> => {
  const enabled = await _isHistoryEnabled();
  if (!enabled) {
    return { success: false, error: "History is not enabled" };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  if (!/^[a-f0-9]{7,40}$/i.test(commitHash)) {
    return { success: false, error: "Invalid commit hash" };
  }

  const canEdit = await canReach(
    noteUuid,
    "note",
    currentUser.username,
    PermissionTypes.EDIT
  );

  if (!canEdit) {
    return { success: false, error: "Permission denied" };
  }

  const versionResult = await getVersion(noteUuid, noteOwner, commitHash);

  if (!versionResult.success || !versionResult.data) {
    return { success: false, error: versionResult.error };
  }

  const { updateNote } = await import("@/app/_server/actions/note");

  const formData = new FormData();
  formData.append("uuid", noteUuid);
  formData.append("title", versionResult.data.title);
  formData.append("content", versionResult.data.content);

  const result = await updateNote(formData);

  if (result.error) {
    return { success: false, error: result.error };
  }

  return { success: true };
};

export const deleteAllRepos = async (): Promise<HistoryResult<void>> => {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isSuperAdmin) {
    return { success: false, error: "Permission denied" };
  }

  try {
    const users = await readJsonFile(USERS_FILE);
    const dataDir = path.join(process.cwd(), "data", NOTES_FOLDER);

    for (const user of users) {
      const userDir = path.join(dataDir, user.username);
      const userGitDir = path.join(userDir, ".git");
      const userLockFile = LOCK_PATH(user.username);
      const userGitignore = path.join(userDir, ".gitignore");

      try {
        await fs.rm(userGitDir, { recursive: true, force: true });
      } catch { }

      await _dropLegacyLock(userDir);

      try {
        await fs.rm(`${userLockFile}.lock`, { recursive: true, force: true });
        await fs.rm(userLockFile, { force: true });
      } catch { }

      try {
        await fs.unlink(userGitignore);
      } catch { }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};
