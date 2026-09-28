import { lock, unlock } from "proper-lockfile";
import fs from "fs/promises";
import path from "path";
import { cookies, headers } from "next/headers";
import { Result } from "@/app/_types";
import { SESSION_DATA_FILE, SESSIONS_FILE } from "@/app/_consts/files";
import { getSessionCookieName } from "@/app/_utils/env-utils";
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

const _stamp = async (
  sessionId: string,
  username: string,
  loginType: LoginType,
  rememberMe?: boolean,
): Promise<SessionData> => {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const now = new Date().toISOString();

  return {
    id: sessionId,
    username,
    userAgent: headersList.get("user-agent") || "Unknown",
    ipAddress: forwarded || realIp || "Unknown",
    createdAt: now,
    lastActivity: now,
    loginType,
    ...(rememberMe !== undefined && { rememberMe }),
  };
};

export const readSessionData = async (): Promise<
  Record<string, SessionData>
> => readSessionMeta();

export const readSessions = async (): Promise<Session> => readSessionMap();

export const createSession = async (
  sessionId: string,
  username: string,
  loginType: LoginType,
  rememberMe?: boolean,
): Promise<void> => {
  const sessionData = await _stamp(sessionId, username, loginType, rememberMe);

  await mutateSessions((store) => {
    store.data[sessionId] = sessionData;
    store.sessions[sessionId] = username;
    return true;
  });
};

export const swapSession = async (
  oldSessionId: string,
  newSessionId: string,
  username: string,
  loginType: LoginType,
  rememberMe?: boolean,
): Promise<void> => {
  const sessionData = await _stamp(
    newSessionId,
    username,
    loginType,
    rememberMe,
  );

  await mutateSessions((store) => {
    delete store.data[oldSessionId];
    delete store.sessions[oldSessionId];

    store.data[newSessionId] = sessionData;
    store.sessions[newSessionId] = username;

    return true;
  });
};

export const updateSessionActivity = async (
  sessionId: string,
): Promise<void> => {
  await mutateSessions((store) => {
    if (!store.data[sessionId]) return null;

    store.data[sessionId].lastActivity = new Date().toISOString();
    return true;
  });
};

export const removeSession = async (sessionId: string): Promise<void> => {
  await mutateSessions((store) => {
    delete store.data[sessionId];
    delete store.sessions[sessionId];
    return true;
  });
};

export const removeAllSessionsForUser = async (
  username: string,
  exceptSessionId?: string,
): Promise<void> => {
  await mutateSessions((store) => {
    const doomed = Object.entries(store.data)
      .filter(
        ([id, sessionData]) =>
          sessionData.username === username &&
          (!exceptSessionId || id !== exceptSessionId),
      )
      .map(([id]) => id);

    for (const sessionId of doomed) {
      delete store.data[sessionId];
      delete store.sessions[sessionId];
    }

    return true;
  });
};

export const clearAllSessions = async (): Promise<Result<null>> => {
  const cleared = await mutateSessions((store) => {
    store.sessions = {};
    store.data = {};
    return true;
  });

  if (!cleared) {
    return {
      success: false,
      error: "Failed to clear all sessions",
    };
  }

  return { success: true };
};

export const getSessionsForUser = async (
  username: string,
): Promise<SessionData[]> => {
  const sessions = await readSessionMeta();

  return Object.values(sessions).filter(
    (session) => session.username === username,
  );
};

export const getSessionId = async (): Promise<string> => {
  const cookieName = getSessionCookieName();
  return (await cookies()).get(cookieName)?.value || "";
};
