import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { NOTES_FOLDER } from "@/app/_consts/notes";
import { isDebugFlag } from "@/app/_utils/env-utils";
import { User } from "@/app/_types";
import fs from "fs/promises";
import path from "path";
import { mutateUsers } from "./records";

const debugProxy = isDebugFlag("proxy");

const _ssoLog = (message: string, detail: unknown) => {
  if (debugProxy) console.log(`SSO CALLBACK - ${message}`, detail);
};

const _fresh = (username: string, isAdmin: boolean): User => ({
  username,
  passwordHash: "",
  isAdmin,
  createdAt: new Date().toISOString(),
  preferredDateFormat: "system",
  preferredTimeFormat: "system",
});

const _greet = (users: User[], username: string, isAdmin: boolean): true => {
  if (users.length === 0) {
    users.push({ ..._fresh(username, true), isSuperAdmin: true });
    _ssoLog("Created first user as super admin:", username);
    return true;
  }

  const existing = users.find((user) => user.username === username);

  if (!existing) {
    users.push(_fresh(username, isAdmin));
    _ssoLog("Created new user:", { username, isAdmin });
    return true;
  }

  if (isAdmin && !existing.isAdmin) {
    existing.isAdmin = true;
    _ssoLog("Updated existing user to admin:", { username, wasAdmin: false, nowAdmin: true });
    return true;
  }

  _ssoLog("User already exists:", { username, currentIsAdmin: existing.isAdmin, requestedAdmin: isAdmin });
  return true;
};

export const ensureUser = async (username: string, isAdmin: boolean): Promise<void> => {
  const saved = await mutateUsers((users) => _greet(users, username, isAdmin));
  if (!saved) throw new Error(`Could not save the user record for ${username}`);

  await fs.mkdir(path.join(process.cwd(), "data", CHECKLISTS_FOLDER, username), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), "data", NOTES_FOLDER, username), { recursive: true });
};
