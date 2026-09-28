import path from "path";
import fs from "fs/promises";
import simpleGit, { SimpleGit } from "simple-git";
import { lock } from "proper-lockfile";
import { NOTES_FOLDER } from "@/app/_consts/notes";
import { getSettings } from "@/app/_server/actions/config";

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

export interface HistoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type HistoryAction = "create" | "update" | "rename" | "move" | "delete";

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

export const notesRepoDir = (username: string) =>
  path.join(process.cwd(), "data", NOTES_FOLDER, username);

export const historyLockPath = (username: string) =>
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

export const repoGit = (userDir: string): SimpleGit => {
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

export const dropLegacyLock = async (userDir: string): Promise<void> => {
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
  const lockPath = historyLockPath(username);
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

export const parseCommit = (
  message: string
): { action: string; title: string } => {
  const match = message.match(/^\[(\w+)\]\s*(.*)$/);
  if (match) {
    return { action: match[1], title: match[2] };
  }
  return { action: "update", title: message };
};

export const historyEnabled = async (): Promise<boolean> => {
  try {
    const settings = await getSettings();
    return settings?.editor?.historyEnabled === true;
  } catch {
    return false;
  }
};

export const ensureRepo = async (username: string): Promise<void> => {
  const userDir = notesRepoDir(username);
  const gitDir = path.join(userDir, ".git");

  await dropLegacyLock(userDir);

  try {
    await fs.access(gitDir);
  } catch {
    const git = repoGit(userDir);
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
  const enabled = await historyEnabled();
  if (!enabled) {
    return { success: false };
  }
  const userDir = notesRepoDir(username);

  try {
    await fs.access(userDir);
  } catch {
    return { success: false, error: "User directory not found" };
  }

  await ensureRepo(username);

  try {
    return await gatekeeper(username, async () => {
      const git = repoGit(userDir);
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
  const enabled = await historyEnabled();
  if (!enabled) {
    return { success: true };
  }

  const userDir = notesRepoDir(username);

  try {
    await fs.access(userDir);
  } catch {
    return { success: false, error: "User directory not found" };
  }

  await ensureRepo(username);

  try {
    return await gatekeeper(username, async () => {
      const git = repoGit(userDir);
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
