import { lock, unlock } from "proper-lockfile";
import fs from "fs/promises";
import path from "path";
import { SESSION_DATA_FILE, SESSIONS_FILE } from "@/app/_consts/files";
import { readJsonFile, writeJsonFile } from "../file";

export type LoginType = "local" | "sso" | "ldap" | "pending-mfa";

export interface SessionData {
  id: string;
  username: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  lastActivity: string;
  loginType?: LoginType;
  rememberMe?: boolean;
}

export interface Session {
  [key: string]: string;
}

export interface SessionStore {
  sessions: Session;
  data: Record<string, SessionData>;
}

const LOCK_RETRIES = { retries: 10, minTimeout: 50, maxTimeout: 500 };

const EMPTY_STORE = "{}";

const touchStoreFiles = async (): Promise<string> => {
  const sessionsPath = path.join(process.cwd(), SESSIONS_FILE);
  const dataPath = path.join(process.cwd(), SESSION_DATA_FILE);

  await fs.mkdir(path.dirname(sessionsPath), { recursive: true });

  for (const target of [sessionsPath, dataPath]) {
    try {
      await fs.access(target);
    } catch {
      await fs.writeFile(target, EMPTY_STORE, "utf-8");
    }
  }

  return sessionsPath;
};

export const readSessionMap = async (): Promise<Session> =>
  (await readJsonFile(SESSIONS_FILE)) || {};

export const readSessionMeta = async (): Promise<
  Record<string, SessionData>
> => (await readJsonFile(SESSION_DATA_FILE)) || {};

/**
 * Every read-modify-write of the two session files goes through here. Both are
 * held under one lock because a session id and its metadata have to land
 * together. The mutator sees the freshest store; returning null aborts the write.
 */
export const mutateSessions = async <T>(
  mutator: (store: SessionStore) => Promise<T | null> | T | null,
): Promise<T | null> => {
  const sessionsPath = await touchStoreFiles();

  try {
    await lock(sessionsPath, { retries: LOCK_RETRIES });
  } catch (error) {
    console.error("Failed to lock sessions file for update:", error);
    return null;
  }

  try {
    const store: SessionStore = {
      sessions: await readSessionMap(),
      data: await readSessionMeta(),
    };

    const outcome = await mutator(store);

    if (outcome === null) return null;

    await writeJsonFile(store.data, SESSION_DATA_FILE);
    await writeJsonFile(store.sessions, SESSIONS_FILE);

    return outcome;
  } catch (error) {
    console.error("Failed to update sessions:", error);
    return null;
  } finally {
    try {
      await unlock(sessionsPath);
    } catch (error) {
      console.error("Failed to release sessions file lock:", error);
    }
  }
};
