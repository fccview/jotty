import { linkSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "fs";
import path from "path";
import { NextRequest } from "next/server";

export const ALICE_PLAN = "11111111-1111-4111-8111-111111111111";
export const ALICE_DIARY = "22222222-2222-4222-8222-222222222222";
export const ALICE_PUBLIC = "33333333-3333-4333-8333-333333333333";
export const BOB_BOARD = "44444444-4444-4444-8444-444444444444";
export const NOBODY = "55555555-5555-4555-8555-555555555555";

export const dataPath = (...parts: string[]): string =>
  path.join(process.cwd(), "data", ...parts);

export const writeItem = (
  rel: string,
  uuid: string,
  body = "body",
  extra = "",
): string => {
  const filePath = dataPath(rel);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `---\nuuid: ${uuid}\ntitle: ${path.basename(rel, ".md")}\n${extra}---\n\n${body}`);
  return filePath;
};

export const writeAttachment = (uuid: string, name: string, content = "bytes"): string => {
  const filePath = dataPath("attachments", uuid, name);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
  return filePath;
};

export const linkAttachment = (from: string, uuid: string, name: string): string => {
  const target = dataPath("attachments", uuid, name);
  mkdirSync(path.dirname(target), { recursive: true });
  linkSync(from, target);
  return target;
};

export const symlinkAttachment = (target: string, uuid: string, name: string): void => {
  const link = dataPath("attachments", uuid, name);
  mkdirSync(path.dirname(link), { recursive: true });
  symlinkSync(target, link);
};

export const writeLegacy = (owner: string, dir: string, name: string, content = "legacy"): string => {
  const filePath = dataPath("notes", owner, dir, name);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
  return filePath;
};

export const writeUsers = (users: object[]): void => {
  mkdirSync(dataPath("users"), { recursive: true });
  writeFileSync(dataPath("users", "users.json"), JSON.stringify(users, null, 2));
};

export const readUsers = (): { username: string; uuid?: string; avatarUrl?: string }[] =>
  JSON.parse(readFileSync(dataPath("users", "users.json"), "utf-8"));

export const stampVersion = (version: number): void => {
  mkdirSync(dataPath(), { recursive: true });
  writeFileSync(dataPath(".schema-version"), String(version));
};

export const read = (filePath: string): string => readFileSync(filePath, "utf-8");

export const get = (url: string, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(new URL(url, "http://localhost"), { headers });

export const params = <T>(value: T) => ({ params: Promise.resolve(value) });
