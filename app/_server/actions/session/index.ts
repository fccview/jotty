"use server";

import fs from "fs/promises";
import { cookies, headers } from "next/headers";
import { Result } from "@/app/_types";
import { readJsonFile, writeJsonFile } from "../file";
import { SESSION_DATA_FILE, SESSIONS_FILE } from "@/app/_consts/files";
import { getCurrentUser } from "../users";

export interface SessionData {
  id: string;
  username: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  lastActivity: string;
  loginType?: "local" | "sso";
}

export interface Session {
  [key: string]: string;
}

export const readSessionData = async (): Promise<
  Record<string, SessionData>
> => {
  const data = await readJsonFile(SESSION_DATA_FILE);
  return data || {};
};

export const writeSessionData = async (
  sessions: Record<string, SessionData>
): Promise<void> => {
  await writeJsonFile(sessions, SESSION_DATA_FILE);
};

export const writeSessions = async (sessions: Session): Promise<void> => {
  await writeJsonFile(sessions, SESSIONS_FILE);
};

export const readSessions = async (): Promise<Session> => {
  const data = await readJsonFile(SESSIONS_FILE);
  return data || {};
};

export const createSession = async (
  sessionId: string,
  username: string,
  loginType: "local" | "sso"
): Promise<void> => {
  const headersList = headers();
  const userAgent = headersList.get("user-agent") || "Unknown";
  const forwarded = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const ipAddress = forwarded || realIp || "Unknown";

  const sessionData: SessionData = {
    id: sessionId,
    username,
    userAgent,
    ipAddress,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    loginType,
  };

  const sessionsData = await readSessionData();
  const sessions = await readSessions();
  sessionsData[sessionId] = sessionData;
  sessions[sessionId] = username;
  await writeSessions(sessions);
  await writeSessionData(sessionsData);
};

export const updateSessionActivity = async (
  sessionId: string
): Promise<void> => {
  const sessionsData = await readSessionData();
  if (sessionsData[sessionId]) {
    sessionsData[sessionId].lastActivity = new Date().toISOString();
    await writeSessionData(sessionsData);
  }
};

export const removeSession = async (sessionId: string): Promise<void> => {
  const sessionsData = await readSessionData();
  const sessions = await readSessions();
  delete sessionsData[sessionId];
  delete sessions[sessionId];
  await writeSessionData(sessionsData);
  await writeSessions(sessions);
};

export const getSessionsForUser = async (
  username: string
): Promise<SessionData[]> => {
  const sessions = await readSessionData();
  return Object.values(sessions).filter(
    (session) => session.username === username
  );
};

export const getSessionId = async (): Promise<string> => {
  const cookieName =
    process.env.NODE_ENV === "production" && process.env.HTTPS === "true"
      ? "__Host-session"
      : "session";
  return cookies().get(cookieName)?.value || "";
};

export const getLoginType = async (): Promise<"local" | "sso" | undefined> => {
  const sessionId = await getSessionId();
  if (!sessionId) return undefined;

  const sessionsData = await readSessionData();
  return sessionsData[sessionId]?.loginType;
};

export const removeAllSessionsForUser = async (
  username: string,
  exceptSessionId?: string
): Promise<void> => {
  const sessionsData = await readSessionData();
  const sessions = await readSessions();
  const sessionsToRemove = Object.entries(sessionsData)
    .filter(
      ([id, sessionData]) =>
        sessionData.username === username &&
        (!exceptSessionId || id !== exceptSessionId)
    )
    .map(([id]) => id);

  for (const sessionId of sessionsToRemove) {
    delete sessionsData[sessionId];
    delete sessions[sessionId];
  }

  await writeSessionData(sessionsData);
  await writeSessions(sessions);
};

export const clearAllSessions = async (): Promise<Result<null>> => {
  try {
    await fs.writeFile(SESSIONS_FILE, JSON.stringify({}), "utf-8");
    await fs.writeFile(SESSION_DATA_FILE, JSON.stringify({}), "utf-8");

    return { success: true };
  } catch (error) {
    console.error("Error clearing all sessions:", error);
    return {
      success: false,
      error: "Failed to clear all sessions",
    };
  }
};

export const terminateSession = async (
  formData: FormData
): Promise<Result<null>> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const sessionId = formData.get("sessionId") as string;

    if (!sessionId) {
      return {
        success: false,
        error: "Session ID is required",
      };
    }

    await removeSession(sessionId);

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    console.error("Error terminating session:", error);
    return {
      success: false,
      error: "Failed to terminate session",
    };
  }
};

export const terminateAllOtherSessions = async (): Promise<Result<null>> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const cookieName =
      process.env.NODE_ENV === "production" && process.env.HTTPS === "true"
        ? "__Host-session"
        : "session";
    const sessionId = cookies().get(cookieName)?.value;

    await removeAllSessionsForUser(currentUser.username, sessionId);

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    console.error("Error terminating all other sessions:", error);
    return {
      success: false,
      error: "Failed to terminate sessions",
    };
  }
};
