"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import path from "path";
import { lock, unlock } from "proper-lockfile";
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
import { getUsername, ensureUser } from "../users";
import {
  isSecureEnv,
  getAuthMode,
  getSessionCookieName,
  getMfaPendingCookieName,
} from "@/app/_utils/env-utils";
import { ldapLogin } from "./ldap";

interface User {
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  createdAt?: string;
  lastLogin?: string;
  failedLoginAttempts?: number;
  nextAllowedLoginAttempt?: string;
  mfaEnabled?: boolean;
}

const hashPassword = (password: string): string => {
  return createHash("sha256").update(password).digest("hex");
};

const _generateSessionId = (): string => randomBytes(32).toString("hex");

async function _setSessionCookie(
  sessionId: string,
  cookieName: string,
  maxAge?: number,
) {
  const opts: Parameters<Awaited<ReturnType<typeof cookies>>["set"]>[2] = {
    httpOnly: true,
    secure: isSecureEnv(),
    sameSite: "lax",
    path: "/",
  };
  if (maxAge !== undefined) opts.maxAge = maxAge;
  (await cookies()).set(cookieName, sessionId, opts);
}

async function _handleFailedLogin(
  users: User[],
  username: string,
  bruteforceProtectionDisabled: boolean,
) {
  const user = users.find(
    (u: User) => u.username.toLowerCase() === username.toLowerCase(),
  );

  if (user && !bruteforceProtectionDisabled) {
    const userIndex = users.findIndex(
      (u: User) => u.username.toLowerCase() === username.toLowerCase(),
    );

    if (userIndex !== -1) {
      const failedAttempts =
        (users[userIndex].failedLoginAttempts || 0) + 1;
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
        `Invalid credentials - attempt ${failedAttempts}`,
      );

      const attemptsRemaining = Math.max(0, 4 - failedAttempts);
      const waitSeconds = delayMs > 0 ? Math.ceil(delayMs / 1000) : 0;

      return {
        error:
          delayMs > 0
            ? "Too many failed attempts"
            : "Invalid username or password",
        attemptsRemaining,
        failedAttempts,
        ...(lockedUntil && { lockedUntil, waitSeconds }),
      };
    }
  }

  await logAuthEvent("login", username, false, "Invalid username or password");
  return {
    error: "Invalid username or password",
    attemptsRemaining: undefined as number | undefined,
    failedAttempts: undefined as number | undefined,
    lockedUntil: undefined as string | undefined,
    waitSeconds: undefined as number | undefined,
  };
}

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
        (u: User) => u.username.toLowerCase() === username.toLowerCase(),
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

  const sessionId = _generateSessionId();

  let sessions = await readSessions();

  if (isFirstUser) {
    sessions = {
      [sessionId]: username,
    };
  } else {
    sessions[sessionId] = username;
  }

  await writeSessions(sessions);

  await _setSessionCookie(sessionId, getSessionCookieName(), 30 * 24 * 60 * 60);

  const userChecklistDir = path.join(
    process.cwd(),
    "data",
    CHECKLISTS_FOLDER,
    username,
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
  const rememberMe = formData.get("rememberMe") === "true";

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  const usersFile = path.join(process.cwd(), "data", "users", "users.json");
  await fs.mkdir(path.dirname(usersFile), { recursive: true });
  try { await fs.access(usersFile); } catch { await fs.writeFile(usersFile, "[]", "utf-8"); }
  await lock(usersFile);
  let lockReleased = false;

  try {
    const users = (await readJsonFile(USERS_FILE)) || [];
    const user = users.find(
      (u: User) => u.username.toLowerCase() === username.toLowerCase(),
    );

    const bruteforceProtectionDisabled =
      process.env.DISABLE_BRUTEFORCE_PROTECTION === "true";

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
          `Rate limited - attempt ${(user.failedLoginAttempts || 0) + 1}`,
        );
        return {
          error: "Too many failed attempts",
          lockedUntil: user.nextAllowedLoginAttempt,
          attemptsRemaining: 0,
          waitSeconds,
        };
      }
    }

    if (getAuthMode() === "ldap") {
      const ldapResult = await ldapLogin(username, password);

      if (!ldapResult.ok) {
        if (ldapResult.kind === "connection_error") {
          await logAuthEvent("login", username, false, "LDAP connection error");
          return { error: "Authentication service unavailable" };
        }

        if (ldapResult.kind === "unauthorized") {
          lockReleased = true;
          await unlock(usersFile);
          redirect("/auth/login?error=unauthorized");
        }

        return await _handleFailedLogin(users, username, bruteforceProtectionDisabled);
      }

      lockReleased = true;
      await unlock(usersFile);

      await ensureUser(ldapResult.username, ldapResult.isAdmin);

      const ldapSessionId = _generateSessionId();
      const ldapMaxAge = rememberMe ? 30 * 24 * 60 * 60 : undefined;
      await createSession(ldapSessionId, ldapResult.username, "ldap", rememberMe);
      await _setSessionCookie(ldapSessionId, getSessionCookieName(), ldapMaxAge);
      await logAuthEvent("login", ldapResult.username, true);

      redirect("/");
    }

    if (!user || user.passwordHash !== hashPassword(password)) {
      return await _handleFailedLogin(users, username, bruteforceProtectionDisabled);
    }

    if (user.mfaEnabled) {
      const pendingSessionId = _generateSessionId();
      await _setSessionCookie(pendingSessionId, getMfaPendingCookieName(), 10 * 60);
      await createSession(pendingSessionId, user.username, "pending-mfa", rememberMe);

      redirect("/auth/verify-mfa");
    }

    const userIndex = users.findIndex(
      (u: User) => u.username.toLowerCase() === username.toLowerCase(),
    );
    if (userIndex !== -1) {
      users[userIndex].lastLogin = new Date().toISOString();
      users[userIndex].failedLoginAttempts = 0;
      users[userIndex].nextAllowedLoginAttempt = undefined;
      await writeJsonFile(users, USERS_FILE);
    }

    const sessionId = _generateSessionId();
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : undefined;

    await createSession(sessionId, user.username, "local", rememberMe);
    await _setSessionCookie(sessionId, getSessionCookieName(), maxAge);
    await logAuthEvent("login", user.username, true);

    redirect("/");
  } finally {
    if (!lockReleased) {
      await unlock(usersFile);
    }
  }
};

export const logout = async () => {
  const username = await getUsername();
  const cookieName = getSessionCookieName();
  const sessionId = (await cookies()).get(cookieName)?.value;

  if (sessionId) {
    const sessions = await readSessionData();

    try {
      delete sessions[sessionId];

      await writeSessionData(sessions);
      await removeSession(sessionId);

      (await cookies()).delete(cookieName);
    } catch (error) {
      (await cookies()).delete(cookieName);
    }
  }

  await logAuthEvent("logout", username || "unknown", true);

  if (getAuthMode() === "oidc") {
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

  const pendingCookieName = getMfaPendingCookieName();

  const pendingSessionId = (await cookies()).get(pendingCookieName)?.value;

  if (!pendingSessionId) {
    return { error: "No pending MFA session" };
  }

  const sessions = await readSessions();
  const username = sessions[pendingSessionId];

  if (!username) {
    return { error: "Invalid session" };
  }

  const sessionDataStore = await readSessionData();
  const rememberMe = sessionDataStore[pendingSessionId]?.rememberMe ?? false;

  const users = await readJsonFile(USERS_FILE);
  const user = users.find(
    (u: User) => u.username.toLowerCase() === username.toLowerCase(),
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
    (u: User) => u.username.toLowerCase() === username.toLowerCase(),
  );
  if (userIndex !== -1) {
    users[userIndex].lastLogin = new Date().toISOString();
    users[userIndex].failedLoginAttempts = 0;
    users[userIndex].nextAllowedLoginAttempt = undefined;
    await writeJsonFile(users, USERS_FILE);
  }

  const sessionId = _generateSessionId();
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : undefined;

  sessions[sessionId] = username;
  delete sessions[pendingSessionId];
  await writeSessions(sessions);

  await removeSession(pendingSessionId);
  await createSession(sessionId, username, "local", rememberMe);

  (await cookies()).delete(pendingCookieName);
  await _setSessionCookie(sessionId, getSessionCookieName(), maxAge);

  await logAuthEvent("login", username, true);

  redirect("/");
};
