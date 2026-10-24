import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/_server/actions/users/records", () => ({
  findUserRecord: vi.fn(async (username: string) => (username === "alice" ? { username } : null)),
}));

import { exportName, exportableUser, EXPORT_TOKEN_BYTES } from "@/app/_server/actions/export/naming";

describe("Security: export file names", () => {
  it("carries an unguessable token", () => {
    const first = exportName("whole_data_folder");
    const second = exportName("whole_data_folder");

    expect(first).toMatch(new RegExp(`^whole_data_folder_\\d+_[a-f0-9]{${EXPORT_TOKEN_BYTES * 2}}\\.zip$`));
    expect(first).not.toBe(second);
  });

  it("only exports a user that exists", async () => {
    expect(await exportableUser("alice")).toBe(true);
    expect(await exportableUser("nobody")).toBe(false);
  });

  it.each(["../users", "../../etc", "a/b", "a\\b", ".", "..", ".alice", ""])(
    "refuses the export username %j",
    async (username) => {
      expect(await exportableUser(username)).toBe(false);
    },
  );
});
