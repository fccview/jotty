import { lock, unlock } from "proper-lockfile";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { NOTES_FOLDER } from "@/app/_consts/notes";
import { isDebugFlag } from "@/app/_utils/env-utils";
import fs from "fs/promises";
import path from "path";

const debugProxy = isDebugFlag("proxy");

export async function ensureUser(
  username: string,
  isAdmin: boolean,
): Promise<void> {
  const usersFile = path.join(process.cwd(), "data", "users", "users.json");
  await fs.mkdir(path.dirname(usersFile), { recursive: true });

  await lock(usersFile);
  try {
    let users: any[] = [];
    try {
      const content = await fs.readFile(usersFile, "utf-8");
      if (content) {
        users = JSON.parse(content);
      }
    } catch {}

    if (users.length === 0) {
      users.push({
        username,
        passwordHash: "",
        isAdmin: true,
        isSuperAdmin: true,
        createdAt: new Date().toISOString(),
      });
      if (debugProxy) {
        console.log(
          "SSO CALLBACK - Created first user as super admin:",
          username,
        );
      }
    } else {
      const existing = users.find((u) => u.username === username);
      if (!existing) {
        users.push({
          username,
          passwordHash: "",
          isAdmin,
          createdAt: new Date().toISOString(),
        });
        if (debugProxy) {
          console.log("SSO CALLBACK - Created new user:", {
            username,
            isAdmin,
          });
        }
      } else {
        const wasAdmin = existing.isAdmin;
        if (isAdmin && !existing.isAdmin) {
          existing.isAdmin = true;
          if (debugProxy) {
            console.log("SSO CALLBACK - Updated existing user to admin:", {
              username,
              wasAdmin,
              nowAdmin: true,
            });
          }
        } else if (debugProxy) {
          console.log("SSO CALLBACK - User already exists:", {
            username,
            currentIsAdmin: existing.isAdmin,
            requestedAdmin: isAdmin,
          });
        }
      }
    }
    await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
  } finally {
    await unlock(usersFile);
  }

  const checklistDir = path.join(
    process.cwd(),
    "data",
    CHECKLISTS_FOLDER,
    username,
  );
  const notesDir = path.join(process.cwd(), "data", NOTES_FOLDER, username);
  await fs.mkdir(checklistDir, { recursive: true });
  await fs.mkdir(notesDir, { recursive: true });
}
