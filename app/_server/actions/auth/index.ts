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

  if (!user || user.passwordHash !== hashPassword(password)) {
    return { error: "Invalid username or password" };
  }

  const userIndex = users.findIndex(
    (u: User) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (userIndex !== -1) {
    users[userIndex].lastLogin = new Date().toISOString();
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

  redirect("/");
};

export const logout = async () => {
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

  if (process.env.SSO_MODE === "oidc") {
    redirect("/api/oidc/logout");
  } else {
    redirect("/auth/login");
  }
};
