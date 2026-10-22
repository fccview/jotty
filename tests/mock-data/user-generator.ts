import { promises as fs } from "fs";
import path from "path";
import { createHash, randomUUID } from "crypto";
import lockfile from "proper-lockfile";
import { faker } from "@faker-js/faker";
import { SEED } from "./constants";

type UserRecord = Record<string, unknown>;

const COUNT_FLAG = "--count=";
const REMOVE_FLAG = "--remove";
const DEFAULT_COUNT = 40;
const MOCK_FLAG = "mockUserCreated";
const USERS_FILE = path.join(process.cwd(), "data", "users", "users.json");

const count = Number(
  process.argv.find((arg) => arg.startsWith(COUNT_FLAG))?.slice(COUNT_FLAG.length) || DEFAULT_COUNT,
);

const withUsers = async (change: (users: UserRecord[]) => UserRecord[]) => {
  const release = await lockfile.lock(USERS_FILE, { retries: { retries: 10, minTimeout: 100 } });
  try {
    const users = JSON.parse(await fs.readFile(USERS_FILE, "utf-8")) as UserRecord[];
    const tmp = `${USERS_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(change(users), null, 2), "utf-8");
    await fs.rename(tmp, USERS_FILE);
  } finally {
    await release();
  }
};

const mockUser = (username: string, now: string): UserRecord => ({
  username,
  [MOCK_FLAG]: true,
  passwordHash: createHash("sha256").update(randomUUID()).digest("hex"),
  isAdmin: false,
  createdAt: now,
  lastLogin: now,
  preferredDateFormat: "system",
  preferredTimeFormat: "system",
  handedness: "right-handed",
  hideMobileStatusDropdown: "disable",
});

const nameFor = (taken: Set<string>) => {
  let name = faker.internet.username().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  while (!name || taken.has(name)) name = `${name}${faker.number.int(99)}`;
  taken.add(name);
  return name;
};

const seed = () =>
  withUsers((users) => {
    faker.seed(SEED);
    const taken = new Set(users.map((user) => String(user.username)));
    const now = new Date().toISOString();
    const added = Array.from({ length: count }, () => mockUser(nameFor(taken), now));
    console.log(`Added ${added.length} mock users. Run again with --remove to delete them.`);
    return [...users, ...added];
  });

const remove = () =>
  withUsers((users) => {
    const kept = users.filter((user) => user[MOCK_FLAG] !== true);
    console.log(`Removed ${users.length - kept.length} mock users.`);
    return kept;
  });

(process.argv.includes(REMOVE_FLAG) ? remove() : seed()).catch((error) => {
  console.error("Mock user generator failed:", error);
  process.exit(1);
});
