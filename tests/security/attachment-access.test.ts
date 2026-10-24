import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { rmSync, writeFileSync, mkdirSync } from "fs";

const { home, root, session } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();
  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-attachment-access-")));
  return { home: previous, root: process.cwd(), session: { user: null as { username: string; isAdmin: boolean } | null } };
});

vi.unmock("fs/promises");

vi.mock("@/app/_server/actions/users/auth", () => ({
  isAuthenticated: async () => Boolean(session.user),
  isAdmin: async () => Boolean(session.user?.isAdmin),
  canAccessAllContent: async () => Boolean(session.user?.isAdmin),
}));

vi.mock("@/app/_server/actions/users/queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users/queries")>()),
  getCurrentUser: async () => session.user,
  getUsername: async () => session.user?.username ?? "",
}));

const { lookups } = vi.hoisted(() => ({ lookups: { count: 0 } }));

vi.mock("@/app/_server/actions/attachments/access", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/app/_server/actions/attachments/access")>();
  return {
    ...real,
    locateItem: (uuid: string) => {
      lookups.count++;
      return real.locateItem(uuid);
    },
  };
});

vi.mock("@/app/_server/actions/api/authenticate", () => ({
  authenticateApiKey: async () => null,
}));

import { GET as getAttachment } from "@/app/api/attachment/[itemUuid]/[name]/route";
import { GET as getImage } from "@/app/api/image/[username]/[filename]/route";
import { GET as getAvatar } from "@/app/api/avatar/[userUuid]/route";
import { invalidatePath } from "@/app/_server/actions/lib/metadata-cache";
import {
  ALICE_DIARY,
  ALICE_PLAN,
  ALICE_PUBLIC,
  NOBODY,
  dataPath,
  get,
  linkAttachment,
  params,
  stampVersion,
  symlinkAttachment,
  writeAttachment,
  writeItem,
  writeLegacy,
} from "../mock-data/attachment-fixture";

const ALICE = { username: "alice", isAdmin: false };
const BOB = { username: "bob", isAdmin: false };
const CAROL = { username: "carol", isAdmin: false };
const ROOT = { username: "root", isAdmin: true };
const AVATAR_OWNER = "66666666-6666-4666-8666-666666666666";

const fetchAttachment = (itemUuid: string, name: string) =>
  getAttachment(get(`/api/attachment/${itemUuid}/${name}`), params({ itemUuid, name }));

const fetchLegacy = (username: string, filename: string) =>
  getImage(get(`/api/image/${username}/${filename}`), params({ username, filename }));

afterAll(() => {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  session.user = null;
  rmSync(dataPath(), { recursive: true, force: true });

  [
    writeItem(`notes/alice/Work/plan.md`, ALICE_PLAN, "![x](/api/attachment/plan/x.png)", "sharedWith: bob:r\n"),
    writeItem(`notes/alice/Private/diary.md`, ALICE_DIARY, "dear diary", "sharedWith: carol:r\n"),
    writeItem(`notes/alice/Blog/post.md`, ALICE_PUBLIC, "hello world", "sharedWith: public:r\n"),
  ].forEach(invalidatePath);

  writeAttachment(ALICE_PLAN, "x.png");
  writeAttachment(ALICE_DIARY, "secret.png");
  writeAttachment(ALICE_PUBLIC, "cover.png");
});

describe("Security: /api/attachment follows the item", () => {
  it("serves the owner", async () => {
    session.user = ALICE;
    const response = await fetchAttachment(ALICE_PLAN, "x.png");
    expect(response.status).toBe(200);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("serves someone the item is shared with", async () => {
    session.user = BOB;
    expect((await fetchAttachment(ALICE_PLAN, "x.png")).status).toBe(200);
  });

  it("refuses someone holding an unrelated share from the same owner (GHSA-mxx8-3h9h-2gc8)", async () => {
    session.user = CAROL;
    expect((await fetchAttachment(ALICE_PLAN, "x.png")).status).toBe(404);
    session.user = BOB;
    expect((await fetchAttachment(ALICE_DIARY, "secret.png")).status).toBe(404);
  });

  it("refuses a stranger with no shares at all", async () => {
    session.user = { username: "mallory", isAdmin: false };
    expect((await fetchAttachment(ALICE_PLAN, "x.png")).status).toBe(404);
  });

  it("asks a logged-out visitor to sign in for a private item", async () => {
    expect((await fetchAttachment(ALICE_PLAN, "x.png")).status).toBe(401);
  });

  it("serves a public item's attachments to anyone, logged out included", async () => {
    expect((await fetchAttachment(ALICE_PUBLIC, "cover.png")).status).toBe(200);
    session.user = CAROL;
    expect((await fetchAttachment(ALICE_PUBLIC, "cover.png")).status).toBe(200);
  });

  it("lets an admin peek", async () => {
    session.user = ROOT;
    expect((await fetchAttachment(ALICE_DIARY, "secret.png")).status).toBe(200);
  });

  it("turns away a made-up item without searching for it", async () => {
    lookups.count = 0;
    expect((await fetchAttachment(NOBODY, "x.png")).status).toBe(401);
    session.user = ALICE;
    expect((await fetchAttachment(NOBODY, "x.png")).status).toBe(404);
    expect(lookups.count).toBe(0);
  });

  it("answers 404 for a uuid that isn't an item", async () => {
    writeAttachment(NOBODY, "orphan.png");
    session.user = ALICE;
    expect((await fetchAttachment(NOBODY, "orphan.png")).status).toBe(404);
  });

  it.each([
    "..%2F..%2Fusers%2Fusers.json",
    "%2e%2e%2fsecret.png",
    "..",
    ".hidden",
    "a%2Fb.png",
    "a%5Cb.png",
    "x.png%00.md",
  ])("refuses the name %s", async (name) => {
    session.user = ALICE;
    expect((await fetchAttachment(ALICE_PLAN, name)).status).toBe(400);
  });

  it("refuses avatars and anything that isn't a uuid as an item", async () => {
    session.user = ROOT;
    expect((await fetchAttachment("avatars", "x.png")).status).toBe(400);
    expect((await fetchAttachment("../notes", "x.png")).status).toBe(400);
  });

  it("never follows a symlink out of the item folder", async () => {
    mkdirSync(dataPath("users"), { recursive: true });
    writeFileSync(dataPath("users", "users.json"), "[]");
    symlinkAttachment(dataPath("users", "users.json"), ALICE_PLAN, "users.png");
    session.user = ALICE;
    expect((await fetchAttachment(ALICE_PLAN, "users.png")).status).toBe(404);
  });

  it("keeps a hardlinked file behind each item's own readers", async () => {
    linkAttachment(dataPath("attachments", ALICE_DIARY, "secret.png"), ALICE_PLAN, "shared.png");

    session.user = BOB;
    expect((await fetchAttachment(ALICE_PLAN, "shared.png")).status).toBe(200);
    expect((await fetchAttachment(ALICE_DIARY, "secret.png")).status).toBe(404);
    session.user = CAROL;
    expect((await fetchAttachment(ALICE_PLAN, "shared.png")).status).toBe(404);
    expect((await fetchAttachment(ALICE_DIARY, "secret.png")).status).toBe(200);
  });

  it("serves byte ranges", async () => {
    writeAttachment(ALICE_PLAN, "clip.mp4", "0123456789");
    session.user = ALICE;
    const response = await getAttachment(
      get(`/api/attachment/${ALICE_PLAN}/clip.mp4`, { range: "bytes=2-5" }),
      params({ itemUuid: ALICE_PLAN, name: "clip.mp4" }),
    );
    expect(response.status).toBe(206);
    expect(await response.text()).toBe("2345");
  });

  it("sandboxes SVG", async () => {
    writeAttachment(ALICE_PLAN, "logo.svg", "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
    session.user = ALICE;
    const response = await fetchAttachment(ALICE_PLAN, "logo.svg");
    expect(response.headers.get("content-security-policy")).toContain("sandbox");
  });
});

describe("Security: legacy media routes", () => {
  beforeEach(() => {
    writeLegacy("alice", "images", "old.png");
  });

  it("before the migration, still serve someone holding any share from the owner", async () => {
    stampVersion(2);
    session.user = CAROL;
    expect((await fetchLegacy("alice", "old.png")).status).toBe(200);
  });

  it("after the migration, serve only the owner and admins", async () => {
    stampVersion(3);
    session.user = CAROL;
    expect((await fetchLegacy("alice", "old.png")).status).toBe(403);
    session.user = ALICE;
    expect((await fetchLegacy("alice", "old.png")).status).toBe(200);
    session.user = ROOT;
    expect((await fetchLegacy("alice", "old.png")).status).toBe(200);
  });

  it("after the migration, ignore SERVE_PUBLIC_IMAGES", async () => {
    stampVersion(3);
    vi.stubEnv("SERVE_PUBLIC_IMAGES", "yes");
    try {
      expect((await fetchLegacy("alice", "old.png")).status).toBe(401);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it.each(["..", ".git", "alice%2F..%2Fbob"])("refuses the owner segment %s", async (username) => {
    stampVersion(3);
    session.user = ROOT;
    expect((await fetchLegacy(username, "old.png")).status).toBe(400);
  });
});

describe("Security: avatars", () => {
  it("serves an avatar by user uuid to anyone", async () => {
    mkdirSync(dataPath("attachments", "avatars"), { recursive: true });
    writeFileSync(dataPath("attachments", "avatars", `${AVATAR_OWNER}.png`), "png");

    const response = await getAvatar(get(`/api/avatar/${AVATAR_OWNER}?v=1`), params({ userUuid: AVATAR_OWNER }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("immutable");
  });

  it.each(["alice", "../users", AVATAR_OWNER.slice(0, 8)])("answers 404 for %s", async (userUuid) => {
    const response = await getAvatar(get(`/api/avatar/${userUuid}`), params({ userUuid }));
    expect(response.status).toBe(404);
  });
});
