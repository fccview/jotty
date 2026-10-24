"use server";

import path from "path";
import fs from "fs/promises";
import { NOTES_FOLDER } from "@/app/_consts/notes";
import { getCurrentUser } from "@/app/_server/actions/users";
import { reachableFile } from "@/app/_server/actions/share/queries";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";
import { USERS_FILE } from "@/app/_consts/files";
import { readJsonFile } from "@/app/_server/actions/file";
import {
  dropLegacyLock,
  ensureRepo,
  historyEnabled,
  historyLockPath,
  notesRepoDir,
  parseCommit,
  repoGit,
} from "./repo";
import type { HistoryEntry, HistoryResult, HistoryVersion } from "./repo";

export type { HistoryEntry, HistoryVersion };

const _ownerOf = (filePath: string): string =>
  path
    .relative(path.join(process.cwd(), "data", NOTES_FOLDER), filePath)
    .split(path.sep)[0];

const _readableNote = async (
  noteUuid: string,
  username: string,
  permission: PermissionTypes,
): Promise<string | null> => {
  const filePath = await reachableFile(
    noteUuid,
    ItemTypes.NOTE,
    username,
    permission,
  );

  return filePath ? _ownerOf(filePath) : null;
};

export const getHistory = async (
  noteUuid: string,
  _noteOwner: string,
  page: number = 1,
  pageSize: number = 20
): Promise<HistoryResult<{ entries: HistoryEntry[]; hasMore: boolean }>> => {
  const enabled = await historyEnabled();
  if (!enabled) {
    return { success: false, error: "History is not enabled" };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  const username = await _readableNote(
    noteUuid,
    currentUser.username,
    PermissionTypes.READ,
  );

  if (!username) {
    return { success: false, error: "Permission denied" };
  }
  const userDir = notesRepoDir(username);

  try {
    await ensureRepo(username);
    const git = repoGit(userDir);

    const { getNoteById } = await import("@/app/_server/actions/note/queries");
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
        const parsed = parseCommit(entry.message);
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
  _noteOwner: string,
  commitHash: string
): Promise<HistoryResult<HistoryVersion>> => {
  const enabled = await historyEnabled();
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

  const username = await _readableNote(
    noteUuid,
    currentUser.username,
    PermissionTypes.READ,
  );

  if (!username) {
    return { success: false, error: "Permission denied" };
  }
  const userDir = notesRepoDir(username);

  try {
    const git = repoGit(userDir);

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
      const { getNoteById } = await import("@/app/_server/actions/note/queries");
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
  _noteOwner: string,
  commitHash: string
): Promise<HistoryResult<void>> => {
  const enabled = await historyEnabled();
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

  const owner = await _readableNote(
    noteUuid,
    currentUser.username,
    PermissionTypes.EDIT,
  );

  if (!owner) {
    return { success: false, error: "Permission denied" };
  }

  const versionResult = await getVersion(noteUuid, owner, commitHash);

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
      const userLockFile = historyLockPath(user.username);
      const userGitignore = path.join(userDir, ".gitignore");

      try {
        await fs.rm(userGitDir, { recursive: true, force: true });
      } catch { }

      await dropLegacyLock(userDir);

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
