"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "crypto";
import path from "path";
import {
  createSession,
  readSessionData,
  readSessions,
  removeSession,
  writeSessionData,
  writeSessions,
} from "../session";
import {
  ensureCorDirsAndFiles,
  ensureDir,
  readJsonFile,
  writeJsonFile,
} from "../file";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import fs from "fs/promises";
import { CHECKLISTS_DIR, NOTES_DIR, USERS_FILE } from "@/app/_consts/files";
import { logAuthEvent } from "../log";
import { getUsername } from "../users";

interface User {
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

const hashPassword = (password: string): string => {
  return createHash("sha256").update(password).digest("hex");
};

/**
 * 🧙‍♂️
 */
const _youShallNotPass = (attempts: number): number => {
  if (attempts <= 3) return 0;

  return Math.pow(2, attempts - 4) * 10 * 1000;
};

export const register = async (formData: FormData) => {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!username || !password || !confirmPassword) {
    return { error: "All fields are required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const users = (await readJsonFile(USERS_FILE)) || [];

  const isFirstUser = users.length === 0;

  if (users.length > 0) {
    if (
      users.some(
        (u: User) => u.username.toLowerCase() === username.toLowerCase()
      )
    ) {
      return { error: "Username already exists" };
    }
  } else {
    await ensureCorDirsAndFiles();
  }

  const newUser: User = {
    username,
    passwordHash: hashPassword(password),
    isAdmin: isFirstUser,
    isSuperAdmin: isFirstUser,
  };

  users.push(newUser);
  await writeJsonFile(users, USERS_FILE);

  const sessionId = createHash("sha256")
    .update(Math.random().toString())
    .digest("hex");

  let sessions = await readSessions();

  if (isFirstUser) {
    sessions = {
      [sessionId]: username,
    };
  } else {
    sessions[sessionId] = username;
  }

  await writeSessions(sessions);

  const cookieName =
    process.env.NODE_ENV === "production" && process.env.HTTPS === "true"
      ? "__Host-session"
      : "session";

  cookies().set(cookieName, sessionId, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  const userChecklistDir = path.join(
    process.cwd(),
    "data",
    CHECKLISTS_FOLDER,
    username
  );
  await fs.mkdir(userChecklistDir, { recursive: true });

  await ensureDir(CHECKLISTS_DIR(username));
  await ensureDir(NOTES_DIR(username));

  await logAuthEvent("register", username, true);

  redirect("/");
};

export const login = async (formData: FormData) => {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  const users = await readJsonFile(USERS_FILE);
  const user = users.find(
    (u: User) => u.username.toLowerCase() === username.toLowerCase()
  );

  const bruteforceProtectionDisabled = process.env.DISABLE_BRUTEFORCE_PROTECTION === "true";

  if (!bruteforceProtectionDisabled && user) {
    const now = Date.now();
    const nextAllowedTime = user.nextAllowedLoginAttempt
      ? new Date(user.nextAllowedLoginAttempt).getTime()
      : 0;

    if (nextAllowedTime > now) {
      const waitSeconds = Math.ceil((nextAllowedTime - now) / 1000);
      await logAuthEvent(
        "login",
        username,
        false,
        `Rate limited - attempt ${(user.failedLoginAttempts || 0) + 1}`
      );
      return {
        error: "Too many failed attempts",
        lockedUntil: user.nextAllowedLoginAttempt,
        attemptsRemaining: 0,
        waitSeconds
      };
    }
  }

  if (!user || user.passwordHash !== hashPassword(password)) {
    if (user && !bruteforceProtectionDisabled) {
      const userIndex = users.findIndex(
        (u: User) => u.username.toLowerCase() === username.toLowerCase()
      );

      if (userIndex !== -1) {
        const failedAttempts = (users[userIndex].failedLoginAttempts || 0) + 1;
        users[userIndex].failedLoginAttempts = failedAttempts;

        const delayMs = _youShallNotPass(failedAttempts);
        let lockedUntil: string | undefined;
        if (delayMs > 0) {
          lockedUntil = new Date(Date.now() + delayMs).toISOString();
          users[userIndex].nextAllowedLoginAttempt = lockedUntil;
        } else {
          users[userIndex].nextAllowedLoginAttempt = undefined;
        }

        await writeJsonFile(users, USERS_FILE);

        await logAuthEvent(
          "login",
          username,
          false,
          `Invalid credentials - attempt ${failedAttempts}`
        );

        const attemptsRemaining = Math.max(0, 4 - failedAttempts);
        const waitSeconds = delayMs > 0 ? Math.ceil(delayMs / 1000) : 0;

        return {
          error: delayMs > 0 ? "Too many failed attempts" : "Invalid username or password",
          attemptsRemaining,
          failedAttempts,
          ...(lockedUntil && { lockedUntil, waitSeconds })
        };
      }
    }

    await logAuthEvent("login", username, false, "Invalid username or password");
    return { error: "Invalid username or password" };
  }

  if (user.mfaEnabled) {
    const pendingSessionId = createHash("sha256")
      .update(`pending-mfa-${Math.random().toString()}`)
      .digest("hex");

    const cookieName =
      process.env.NODE_ENV === "production" && process.env.HTTPS === "true"
        ? "__Host-mfa-pending"
        : "mfa-pending";

    cookies().set(cookieName, pendingSessionId, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });

    await createSession(pendingSessionId, user.username, "pending-mfa");

    redirect("/auth/verify-mfa");
  }

  const userIndex = users.findIndex(
    (u: User) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (userIndex !== -1) {
    users[userIndex].lastLogin = new Date().toISOString();
    users[userIndex].failedLoginAttempts = 0;
    users[userIndex].nextAllowedLoginAttempt = undefined;
    await writeJsonFile(users, USERS_FILE);
  }

  const sessionId = createHash("sha256")
    .update(Math.random().toString())
    .digest("hex");
  const sessions = await readSessions();
  sessions[sessionId] = user.username;

  await writeSessions(sessions);

  await createSession(sessionId, user.username, "local");

  const cookieName =
    process.env.NODE_ENV === "production" && process.env.HTTPS === "true"
      ? "__Host-session"
      : "session";

  cookies().set(cookieName, sessionId, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  await logAuthEvent("login", user.username, true);

  redirect("/");
};

export const logout = async () => {
  const username = await getUsername();

  const cookieName =
    process.env.NODE_ENV === "production" && process.env.HTTPS === "true"
      ? "__Host-session"
      : "session";

  const sessionId = cookies().get(cookieName)?.value;

  if (sessionId) {
    const sessions = await readSessionData();

    try {
      delete sessions[sessionId];

      await writeSessionData(sessions);
      await removeSession(sessionId);

      cookies().delete(cookieName);
    } catch (error) {
      cookies().delete(cookieName);
    }
  }

  await logAuthEvent("logout", username || "unknown", true);

  if (process.env.SSO_MODE === "oidc") {
    redirect("/api/oidc/logout");
  } else {
    redirect("/auth/login");
  }
};

export const verifyMfaLogin = async (formData: FormData) => {
  const code = formData.get("code") as string;
  const useBackupCode = formData.get("useBackupCode") === "true";

  if (!code) {
    return { error: "Code is required" };
  }

  const pendingCookieName =
    process.env.NODE_ENV === "production" && process.env.HTTPS === "true"
      ? "__Host-mfa-pending"
      : "mfa-pending";

  const pendingSessionId = cookies().get(pendingCookieName)?.value;

  if (!pendingSessionId) {
    return { error: "No pending MFA session" };
  }

  const sessions = await readSessions();
  const username = sessions[pendingSessionId];

  if (!username) {
    return { error: "Invalid session" };
  }

  const users = await readJsonFile(USERS_FILE);
  const user = users.find(
    (u: User) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user || !user.mfaEnabled) {
    return { error: "MFA not enabled for this user" };
  }

  const speakeasy = require("speakeasy");
  const { createHash } = require("crypto");

  let isValid = false;

  if (useBackupCode) {
    const hashedCode = createHash("sha256").update(code).digest("hex");
    const recoveryCode = user.mfaRecoveryCode;
    isValid = recoveryCode === hashedCode;
  } else {
    if (!user.mfaSecret) {
      return { error: "MFA not properly configured" };
    }

    const { decryptMfaSecret } = require("@/app/_server/actions/mfa");
    const decryptedSecret = await decryptMfaSecret(user.mfaSecret, username);

    isValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: "base32",
      token: code,
      window: 2,
    });
  }

  if (!isValid) {
    await logAuthEvent("login", username, false, "Invalid MFA code");
    return { error: "Invalid code" };
  }

  const userIndex = users.findIndex(
    (u: User) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (userIndex !== -1) {
    users[userIndex].lastLogin = new Date().toISOString();
    users[userIndex].failedLoginAttempts = 0;
    users[userIndex].nextAllowedLoginAttempt = undefined;
    await writeJsonFile(users, USERS_FILE);
  }

  const sessionId = createHash("sha256")
    .update(Math.random().toString())
    .digest("hex");

  sessions[sessionId] = username;
  delete sessions[pendingSessionId];
  await writeSessions(sessions);

  await removeSession(pendingSessionId);
  await createSession(sessionId, username, "local");

  cookies().delete(pendingCookieName);

  const cookieName =
    process.env.NODE_ENV === "production" && process.env.HTTPS === "true"
      ? "__Host-session"
      : "session";

  cookies().set(cookieName, sessionId, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  await logAuthEvent("login", username, true);

  redirect("/");
};
