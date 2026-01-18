"use server";

import path from "path";
import fs from "fs/promises";
import simpleGit, { SimpleGit } from "simple-git";
import { lock, unlock } from "proper-lockfile";
import { NOTES_FOLDER } from "@/app/_consts/notes";
import { getCurrentUser } from "@/app/_server/actions/users";
import { checkUserPermission } from "@/app/_server/actions/sharing";
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

const USER_NOTES_DIR = (username: string) =>
  path.join(process.cwd(), "data", NOTES_FOLDER, username);

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

export const commitNote = async (
  username: string,
  relativePath: string,
  action: HistoryAction,
  noteTitle: string,
  metadata?: { oldTitle?: string; oldCategory?: string; newCategory?: string }
): Promise<HistoryResult<string>> => {
  const enabled = await _isHistoryEnabled();
  if (!enabled) {
    return { success: true };
  }

  const userDir = USER_NOTES_DIR(username);
  const lockPath = path.join(userDir, ".historylock");

  try {
    await fs.access(userDir);
  } catch {
    return { success: false, error: "User directory not found" };
  }

  await ensureRepo(username);

  try {
    await fs.writeFile(lockPath, "", { flag: "a" });
  } catch {
    return { success: false, error: "Failed to create lock file" };
  }

  try {
    await lock(lockPath, {
      stale: 30000,
      retries: {
        retries: 5,
        factor: 2,
        minTimeout: 100,
        maxTimeout: 2000,
      },
    });

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
  } catch (error) {
    console.error("Git commit error:", error);
    return { success: false, error: String(error) };
  } finally {
    try {
      await unlock(lockPath);
    } catch {}
  }
};

export const getHistory = async (
  noteUuid: string,
  noteId: string,
  noteCategory: string,
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

  const canRead = await checkUserPermission(
    noteUuid,
    noteCategory || "Uncategorized",
    "note",
    currentUser.username,
    PermissionTypes.READ
  );

  if (!canRead) {
    return { success: false, error: "Permission denied" };
  }

  const username = noteOwner || currentUser.username;
  const userDir = USER_NOTES_DIR(username);
  const filePath = path.join(noteCategory || "Uncategorized", `${noteId}.md`);

  try {
    await ensureRepo(username);
    const git = _getGitInstance(userDir);

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
  noteId: string,
  noteCategory: string,
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

  const canRead = await checkUserPermission(
    noteUuid,
    noteCategory || "Uncategorized",
    "note",
    currentUser.username,
    PermissionTypes.READ
  );

  if (!canRead) {
    return { success: false, error: "Permission denied" };
  }

  const username = noteOwner || currentUser.username;
  const userDir = USER_NOTES_DIR(username);
  const filePath = path.join(noteCategory || "Uncategorized", `${noteId}.md`);

  try {
    const git = _getGitInstance(userDir);

    const commitInfo = await git.raw([
      "show",
      "--name-only",
      "--format=",
      commitHash,
    ]);

    const filesInCommit = commitInfo
      .trim()
      .split("\n")
      .filter((l) => l.length > 0);
    const categoryPrefix = (noteCategory || "Uncategorized") + "/";
    let historicalPath = filePath;

    for (const file of filesInCommit) {
      if (file.startsWith(categoryPrefix) && file.endsWith(".md")) {
        historicalPath = file;
        break;
      }
    }

    const content = await git.show([`${commitHash}:${historicalPath}`]);

    const { extractYamlMetadata } = await import(
      "@/app/_utils/yaml-metadata-utils"
    );
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
        title: metadata.title || noteId,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

export const restoreNoteVersion = async (
  noteUuid: string,
  noteId: string,
  noteCategory: string,
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

  const canEdit = await checkUserPermission(
    noteId,
    noteCategory || "Uncategorized",
    "note",
    currentUser.username,
    PermissionTypes.EDIT
  );

  if (!canEdit) {
    return { success: false, error: "Permission denied" };
  }

  const versionResult = await getVersion(
    noteUuid,
    noteId,
    noteCategory,
    noteOwner,
    commitHash
  );

  if (!versionResult.success || !versionResult.data) {
    return { success: false, error: versionResult.error };
  }

  const { updateNote } = await import("@/app/_server/actions/note");

  const formData = new FormData();
  formData.append("id", noteId);
  formData.append("uuid", noteUuid || "");
  formData.append("title", versionResult.data.title);
  formData.append("content", versionResult.data.content);
  formData.append("category", noteCategory || "Uncategorized");
  formData.append("originalCategory", noteCategory || "Uncategorized");

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
      const userGitDir = path.join(dataDir, user.username, ".git");
      const userLockFile = path.join(dataDir, user.username, ".historylock");
      const userGitignore = path.join(dataDir, user.username, ".gitignore");

      try {
        await fs.rm(userGitDir, { recursive: true, force: true });
      } catch {}

      try {
        await fs.unlink(userLockFile);
      } catch {}

      try {
        await fs.unlink(userGitignore);
      } catch {}
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};
