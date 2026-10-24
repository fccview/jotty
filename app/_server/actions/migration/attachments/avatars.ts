import fs from "fs/promises";
import { IMAGE_MIME_BY_EXT, USERS_FILE } from "@/app/_consts/files";
import { AttachmentKinds, avatarUrl, extOf } from "@/app/_consts/attachments";
import { ResidueKinds } from "@/app/_consts/attachment-migration";
import type { User } from "@/app/_types";
import { readJsonFile } from "@/app/_server/actions/file";
import { backfillUserUuids, mutateUsers } from "@/app/_server/actions/users/records";
import { copyAvatar } from "@/app/_server/actions/attachments/avatars";
import { legacyFileOf } from "@/app/_server/actions/attachments/legacy-files";
import { Ledger, note } from "./item";

const LEGACY_AVATAR = /\/api\/image\/([^/?#\s]+)\/([^/?#\s]+)/;

interface Plan {
  username: string;
  from: string;
  source: string;
  ext: string;
}

const _decode = (value: string): string | null => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

const _plan = async (user: User, ledger: Ledger): Promise<Plan | null> => {
  const from = user.avatarUrl;
  const match = from ? LEGACY_AVATAR.exec(from) : null;
  if (!from || !match) return null;

  const owner = _decode(match[1]);
  const name = _decode(match[2]);
  if (owner !== user.username || !name) {
    note(ledger, ResidueKinds.AVATAR_FOREIGN, `${user.username}: ${from}`);
    return null;
  }

  const ext = extOf(name);
  const source = legacyFileOf(owner, AttachmentKinds.IMAGE, name);
  const stats = source ? await fs.lstat(source).catch(() => null) : null;

  if (!source || !stats?.isFile() || !(ext in IMAGE_MIME_BY_EXT)) {
    note(ledger, ResidueKinds.AVATAR_MISSING, `${user.username}: ${from}`);
    return null;
  }

  return { username: user.username, from, source, ext };
};

const _users = async (): Promise<User[]> => {
  const users = await readJsonFile(USERS_FILE);
  return Array.isArray(users) ? users : [];
};

export const moveAvatars = async (
  dryRun: boolean,
  ledger: Ledger,
): Promise<{ moved: number; uuids: number }> => {
  const before = await _users();
  const missing = before.filter((user) => !user.uuid).length;

  if (dryRun) {
    const plans = await Promise.all(before.map((user) => _plan(user, ledger)));
    return { moved: plans.filter(Boolean).length, uuids: missing };
  }

  const stamped = await backfillUserUuids();
  if (stamped === null) throw new Error("Could not give every user a uuid");

  let moved = 0;
  for (const user of await _users()) {
    const plan = await _plan(user, ledger);
    if (!plan || !user.uuid) continue;

    const version = await copyAvatar(user.uuid, plan.ext, plan.source);
    const swapped = await mutateUsers((users) => {
      const current = users.find((candidate) => candidate.username === plan.username);
      if (!current || current.avatarUrl !== plan.from) return null;
      current.avatarUrl = avatarUrl(user.uuid!, version);
      return true;
    });
    if (swapped) moved++;
  }

  return { moved, uuids: stamped };
};
