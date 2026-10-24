"use server";

import { cookies } from "next/headers";
import { Result } from "@/app/_types";
import { getCurrentUser } from "../users";
import { logAuthEvent } from "@/app/_server/actions/log";
import { getSessionCookieName } from "@/app/_utils/env-utils";
import {
  getSessionId,
  getSessionsForUser,
  readSessionMeta,
  removeAllSessionsForUser,
  removeSession,
} from "./store";
import type { LoginType, SessionData } from "./store";

export type CallerSession = SessionData & { isCurrent: boolean };

export const getLoginType = async (): Promise<LoginType | undefined> => {
  const sessionId = await getSessionId();
  if (!sessionId) return undefined;

  const sessionsData = await readSessionMeta();
  return sessionsData[sessionId]?.loginType;
};

export const getMySessions = async (): Promise<CallerSession[] | null> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const sessionId = await getSessionId();
  const sessions = await getSessionsForUser(currentUser.username);

  return sessions.map((session) => ({
    ...session,
    isCurrent: session.id === sessionId,
  }));
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

    const sessionsData = await readSessionMeta();

    if (sessionsData[sessionId]?.username !== currentUser.username) {
      return {
        success: false,
        error: "Session not found",
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
