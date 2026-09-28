import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs/promises";

const { mockGetCurrentUser } = vi.hoisted(() => ({ mockGetCurrentUser: vi.fn() }));

vi.mock("@/app/_server/actions/users", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/app/_server/actions/file", () => ({ ensureDir: vi.fn() }));

import { logContentEvent } from "@/app/_server/actions/log/writers";
import { actAs } from "@/app/_server/api/caller-scope";
import type { ApiUser } from "@/app/_server/api/contract";

const keyOwner = { username: "keyholder" } as ApiUser;

const writtenPath = () => String(vi.mocked(fs.writeFile).mock.calls.at(-1)?.[0]);

describe("audit log attribution", () => {
  beforeEach(() => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    mockGetCurrentUser.mockResolvedValue(null);
  });

  it("files an API request under the API key owner", async () => {
    await actAs(keyOwner, () => logContentEvent("note_created", "note", "u-1", "Milk", true));
    expect(writtenPath()).toContain("/keyholder/");
  });

  it("still files a browser request under the session user", async () => {
    mockGetCurrentUser.mockResolvedValue({ username: "browser" });
    await logContentEvent("note_created", "note", "u-1", "Milk", true);
    expect(writtenPath()).toContain("/browser/");
  });

  it("falls back to system when nobody is asking", async () => {
    await logContentEvent("note_created", "note", "u-1", "Milk", true);
    expect(writtenPath()).toContain("/system/");
  });
});
