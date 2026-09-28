"use server";

import { cookies, headers } from "next/headers";
import { Result } from "@/app/_types";
import { getCurrentUser } from "../users";
import { logAuthEvent } from "@/app/_server/actions/log";
import { getSessionCookieName } from "@/app/_utils/env-utils";
import { mutateSessions, readSessionMap, readSessionMeta } from "./store";
import type { LoginType, Session, SessionData } from "./store";

export type { LoginType, Session, SessionData };

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

export const getLoginType = async (): Promise<LoginType | undefined> => {
  const sessionId = await getSessionId();
  if (!sessionId) return undefined;

  const sessionsData = await readSessionMeta();
  return sessionsData[sessionId]?.loginType;
};

export const terminateSession = async (
  formData: FormData,
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

    await logAuthEvent("session_terminated", currentUser.username, true);

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    await logAuthEvent(
      "session_terminated",
      "unknown",
      false,
      "Failed to terminate session",
    );
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

    const sessionId = (await cookies()).get(getSessionCookieName())?.value;

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
