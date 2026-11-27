import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { existsSync, readdirSync, rmSync } from "fs";
import { NextRequest } from "next/server";

const { home, root, caller } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();
  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-attachment-writes-")));
  return { home: previous, root: process.cwd(), caller: { user: null as { username: string; isAdmin: boolean } | null } };
});

vi.unmock("fs/promises");

vi.mock("@/app/_server/actions/users/auth", () => ({
  isAuthenticated: async () => false,
  isAdmin: async () => Boolean(caller.user?.isAdmin),
  canAccessAllContent: async () => Boolean(caller.user?.isAdmin),
}));

vi.mock("@/app/_server/actions/users/queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users/queries")>()),
  getCurrentUser: async () => null,
  getUsername: async () => "",
}));

vi.mock("@/app/_server/actions/api/authenticate", () => ({
  authenticateApiKey: async (key: string) => (key ? caller.user : null),
}));

vi.mock("@/app/_server/actions/config", () => ({
  getSettings: async () => ({ maximumFileSize: 1024 }),
}));

import { POST as postAttachment } from "@/app/api/attachment/[itemUuid]/route";
import { DELETE as deleteAttachment, GET as getAttachment } from "@/app/api/attachment/[itemUuid]/[name]/route";
import { invalidatePath } from "@/app/_server/actions/lib/metadata-cache";
import {
  ALICE_DIARY,
  ALICE_PLAN,
  NOBODY,
  dataPath,
  get,
  params,
  read,
  writeAttachment,
  writeItem,
} from "../mock-data/attachment-fixture";

const ALICE = { username: "alice", isAdmin: false };
const BOB = { username: "bob", isAdmin: false };
const CAROL = { username: "carol", isAdmin: false };
const DAVE = { username: "dave", isAdmin: false };
const KEY = { "x-api-key": "ck_test" };

const request = (url: string, method: string, body?: FormData | string, headers: Record<string, string> = KEY) =>
  new NextRequest(new URL(url, "http://localhost"), { method, headers, body });

const form = (name: string, content: string): FormData => {
  const formData = new FormData();
  formData.append("file", new File([content], name, { type: "image/png" }));
  return formData;
};

const send = (itemUuid: string, body: FormData | string, headers: Record<string, string> = KEY) =>
  postAttachment(request(`/api/attachment/${itemUuid}`, "POST", body, headers), params({ itemUuid }));

const upload = (itemUuid: string, name: string, content = "data", headers: Record<string, string> = KEY) =>
  send(itemUuid, form(name, content), headers);

const remove = (itemUuid: string, name: string, headers: Record<string, string> = KEY) =>
  deleteAttachment(
    request(`/api/attachment/${itemUuid}/${encodeURIComponent(name)}`, "DELETE", undefined, headers),
    params({ itemUuid, name: encodeURIComponent(name) }),
  );

const names = (uuid: string): string[] =>
  existsSync(dataPath("attachments", uuid)) ? readdirSync(dataPath("attachments", uuid)).sort() : [];

afterAll(() => {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  caller.user = null;
  rmSync(dataPath(), { recursive: true, force: true });
  [
    writeItem("notes/alice/Work/plan.md", ALICE_PLAN, "plan", "sharedWith: bob:r\n"),
    writeItem("notes/alice/Private/diary.md", ALICE_DIARY, "diary", "sharedWith: carol:rw, dave:rwd\n"),
  ].forEach(invalidatePath);
});

describe("POST /api/attachment/{itemUuid}", () => {
  it("stores the file and answers with an attachment the same key can fetch back", async () => {
    caller.user = ALICE;
    const response = await upload(ALICE_PLAN, "cat.png");
    const { success, data } = await response.json();

    expect(response.status).toBe(200);
    expect(success).toBe(true);
    expect(data).toMatchObject({
      fileName: "cat.png",
      url: `/api/attachment/${ALICE_PLAN}/cat.png`,
      type: "image",
      mimeType: "image/png",
      size: 4,
      itemUuid: ALICE_PLAN,
    });
    expect(read(dataPath("attachments", ALICE_PLAN, "cat.png"))).toBe("data");

    const fetched = await getAttachment(get(data.url, KEY), params({ itemUuid: ALICE_PLAN, name: "cat.png" }));
    expect(await fetched.text()).toBe("data");
  });

  it("numbers a clashing name instead of overwriting it", async () => {
    caller.user = ALICE;
    await upload(ALICE_PLAN, "cat.png", "one");
    const { data } = await (await upload(ALICE_PLAN, "cat.png", "two")).json();

    expect(data.fileName).toBe("cat-1.png");
    expect(read(dataPath("attachments", ALICE_PLAN, "cat.png"))).toBe("one");
  });

  it("keeps a hostile file name inside the item's folder", async () => {
    caller.user = ALICE;
    const { data } = await (await upload(ALICE_PLAN, "../../users/users.json")).json();

    expect(data.fileName).toBe("users.json");
    expect(names(ALICE_PLAN)).toEqual(["users.json"]);
    expect(existsSync(dataPath("users"))).toBe(false);
  });

  it("lets an editor upload and refuses someone who can only read", async () => {
    caller.user = CAROL;
    expect((await upload(ALICE_DIARY, "cat.png")).status).toBe(200);

    caller.user = BOB;
    const refused = await upload(ALICE_PLAN, "cat.png");
    expect(refused.status).toBe(403);
    expect(await refused.json()).toEqual({ error: "Forbidden" });
    expect(names(ALICE_PLAN)).toEqual([]);
  });

  it("answers 401 without a valid key", async () => {
    caller.user = ALICE;
    expect((await upload(ALICE_PLAN, "cat.png", "data", {})).status).toBe(401);
    expect(names(ALICE_PLAN)).toEqual([]);
  });

  it("answers 404 for an item that does not exist", async () => {
    caller.user = ALICE;
    expect((await upload(NOBODY, "cat.png")).status).toBe(404);
    expect((await upload("not-a-uuid", "cat.png")).status).toBe(404);
  });

  it("answers 413 past the instance's size limit", async () => {
    caller.user = ALICE;
    expect((await upload(ALICE_PLAN, "big.png", "x".repeat(2048))).status).toBe(413);
    expect(names(ALICE_PLAN)).toEqual([]);
  });

  it("stops reading a body past the limit even when it does not say how long it is", async () => {
    caller.user = ALICE;
    let pulled = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull: (controller) => {
        pulled++;
        controller.enqueue(new Uint8Array(64 * 1024));
      },
    });
    const response = await postAttachment(
      new NextRequest(new URL(`/api/attachment/${ALICE_PLAN}`, "http://localhost"), {
        method: "POST",
        headers: { ...KEY, "content-type": "multipart/form-data; boundary=x" },
        body: endless,
        duplex: "half",
      }),
      params({ itemUuid: ALICE_PLAN }),
    );

    expect(response.status).toBe(413);
    expect(pulled).toBeLessThan(10);
    expect(names(ALICE_PLAN)).toEqual([]);
  });

  it("turns away someone who cannot edit before reading what they sent", async () => {
    caller.user = BOB;
    let pulled = 0;
    const unread = new ReadableStream<Uint8Array>({
      pull: (controller) => {
        pulled++;
        controller.enqueue(new Uint8Array(16));
      },
    }, { highWaterMark: 0 });
    const response = await postAttachment(
      new NextRequest(new URL(`/api/attachment/${ALICE_PLAN}`, "http://localhost"), {
        method: "POST",
        headers: { ...KEY, "content-type": "multipart/form-data; boundary=x" },
        body: unread,
        duplex: "half",
      }),
      params({ itemUuid: ALICE_PLAN }),
    );

    expect(response.status).toBe(403);
    expect(pulled).toBe(0);
  });

  it("answers 400 when there is no file or the body is not a form", async () => {
    caller.user = ALICE;

    const empty = await send(ALICE_PLAN, new FormData());
    expect(empty.status).toBe(400);
    expect((await empty.json()).error).toBe("file is required");

    const text = new FormData();
    text.append("file", "just a string");
    expect((await send(ALICE_PLAN, text)).status).toBe(400);

    const json = await send(ALICE_PLAN, "{}", { ...KEY, "content-type": "application/json" });
    expect(json.status).toBe(400);
    expect(names(ALICE_PLAN)).toEqual([]);
  });
});

describe("DELETE /api/attachment/{itemUuid}/{name}", () => {
  it("removes the file", async () => {
    caller.user = ALICE;
    writeAttachment(ALICE_PLAN, "my cat.png");
    const response = await remove(ALICE_PLAN, "my cat.png");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(names(ALICE_PLAN)).toEqual([]);
  });

  it("needs delete permission, edit is not enough", async () => {
    writeAttachment(ALICE_DIARY, "cat.png");

    caller.user = CAROL;
    expect((await remove(ALICE_DIARY, "cat.png")).status).toBe(403);
    expect(names(ALICE_DIARY)).toEqual(["cat.png"]);

    caller.user = DAVE;
    expect((await remove(ALICE_DIARY, "cat.png")).status).toBe(200);
    expect(names(ALICE_DIARY)).toEqual([]);
  });

  it("answers 401 without a valid key and 404 for a file or item that is not there", async () => {
    writeAttachment(ALICE_PLAN, "cat.png");
    caller.user = ALICE;

    expect((await remove(ALICE_PLAN, "cat.png", {})).status).toBe(401);
    expect((await remove(ALICE_PLAN, "dog.png")).status).toBe(404);
    expect((await remove(NOBODY, "cat.png")).status).toBe(404);
    expect(names(ALICE_PLAN)).toEqual(["cat.png"]);
  });

  it("refuses a name that reaches outside the item's folder", async () => {
    caller.user = ALICE;
    writeAttachment(ALICE_PLAN, "cat.png");
    writeAttachment(ALICE_DIARY, "secret.png");

    expect((await remove(ALICE_PLAN, `../${ALICE_DIARY}/secret.png`)).status).toBe(400);
    expect((await remove(ALICE_PLAN, ".hidden")).status).toBe(400);
    expect(names(ALICE_DIARY)).toEqual(["secret.png"]);
  });
});
