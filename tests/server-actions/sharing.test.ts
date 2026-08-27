import { describe, it, expect, beforeEach, vi } from "vitest";
import path from "path";
import { resetAllMocks } from "../setup";

const mockReadCatInfo = vi.fn();
const mockGrepExtractFrontmatter = vi.fn();
const mockGrepFindFileByUuid = vi.fn();
const mockGrepFilesByText = vi.fn();
const mockGrepListAllFiles = vi.fn();
const mockIsAdmin = vi.fn();
const mockCanAccessAllContent = vi.fn();
const mockGetUsername = vi.fn();
const mockWriteCatInfo = vi.fn();
const mockCatDirByUuid = vi.fn();
const mockCatUuid = vi.fn();
const mockServerReadFile = vi.fn();
const mockServerWriteFile = vi.fn();
const mockLogAudit = vi.fn();
const mockBroadcast = vi.fn();
const mockNotifyUser = vi.fn();
const mockOwnerOfNote = vi.fn();
const mockOwnerOfList = vi.fn();

vi.mock("@/app/_server/actions/share/category-info", () => ({
  readCatInfo: (...args: unknown[]) => mockReadCatInfo(...args),
  writeCatInfo: (...args: unknown[]) => mockWriteCatInfo(...args),
  catDirByUuid: (...args: unknown[]) => mockCatDirByUuid(...args),
  catUuid: (...args: unknown[]) => mockCatUuid(...args),
}));

vi.mock("@/app/_server/actions/file", () => ({
  serverReadFile: (...args: unknown[]) => mockServerReadFile(...args),
  serverWriteFile: (...args: unknown[]) => mockServerWriteFile(...args),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));

vi.mock("@/app/_server/actions/notifications/internal", () => ({
  notifyUser: (...args: unknown[]) => mockNotifyUser(...args),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock("@/app/_utils/grep-utils", () => ({
  grepExtractFrontmatter: (...args: unknown[]) =>
    mockGrepExtractFrontmatter(...args),
  grepFindFileByUuid: (...args: unknown[]) => mockGrepFindFileByUuid(...args),
  grepFilesByText: (...args: unknown[]) => mockGrepFilesByText(...args),
  grepListAllFiles: (...args: unknown[]) => mockGrepListAllFiles(...args),
}));

vi.mock("@/app/_server/actions/users", () => ({
  isAdmin: (...args: unknown[]) => mockIsAdmin(...args),
  canAccessAllContent: (...args: unknown[]) =>
    mockCanAccessAllContent(...args),
  getUsername: (...args: unknown[]) => mockGetUsername(...args),
  getUserByNoteUuid: (...args: unknown[]) => mockOwnerOfNote(...args),
  getUserByChecklistUuid: (...args: unknown[]) => mockOwnerOfList(...args),
}));

import {
  permsFromCode,
  codeFromPerms,
  parseSharedWith,
  toSharedWith,
  isPublicUser,
  mountName,
} from "@/app/_utils/sharing-utils";
import {
  resolveAccess,
  catAccess,
  canReachFile,
  listMounts,
  sharersOf,
} from "@/app/_server/actions/share/access";
import { canReach, isPublicItem } from "@/app/_server/actions/share/queries";
import {
  leaveItem,
  leaveFolder,
  shareItem,
  shareFolder,
  unshareFolder,
  setFolderInherit,
  setFolderPublic,
} from "@/app/_server/actions/share/operations";
import {
  ItemTypes,
  Modes,
  PermissionTypes,
  SharePerms,
} from "@/app/_types/enums";
import { CATEGORY_INFO_FILE, PUBLIC_USER } from "@/app/_consts/sharing";
import { DATA_DIR } from "@/app/_consts/files";

const READ_ONLY = { canRead: true, canEdit: false, canDelete: false };
const WRITABLE = { canRead: true, canEdit: true, canDelete: false };
const FULL = { canRead: true, canEdit: true, canDelete: true };

const NOTES_DIR = path.join(process.cwd(), DATA_DIR, Modes.NOTES);
const OWNER_DIR = path.join(NOTES_DIR, "fccview");
const WORK_DIR = path.join(OWNER_DIR, "Work");
const NESTED_DIR = path.join(WORK_DIR, "Secret");
const WORK_FILE = path.join(WORK_DIR, "plan.md");
const NESTED_FILE = path.join(NESTED_DIR, "keys.md");

const withCatInfo = (byDir: Record<string, unknown>) => {
  mockReadCatInfo.mockImplementation(async (dir: string) => byDir[dir] || {});
};

const withGrepHits = (catInfos: string[], files: string[]) => {
  mockGrepFilesByText.mockImplementation(
    async (_dir: string, _text: string, include: string) =>
      include === CATEGORY_INFO_FILE ? catInfos : files,
  );
};

describe("Sharing", () => {
  beforeEach(() => {
    resetAllMocks();
    mockReadCatInfo.mockResolvedValue({});
    mockGrepExtractFrontmatter.mockResolvedValue(null);
    mockGrepFindFileByUuid.mockResolvedValue(null);
    mockGrepFilesByText.mockResolvedValue([]);
    mockGrepListAllFiles.mockResolvedValue([]);
    mockIsAdmin.mockResolvedValue(false);
    mockCanAccessAllContent.mockResolvedValue(false);
    mockGetUsername.mockResolvedValue("fccview");
    mockWriteCatInfo.mockResolvedValue(true);
    mockCatDirByUuid.mockResolvedValue(WORK_DIR);
    mockCatUuid.mockResolvedValue("work-uuid");
    mockServerReadFile.mockResolvedValue("---\nuuid: note-uuid\n---\nbody");
    mockServerWriteFile.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
    mockBroadcast.mockResolvedValue(undefined);
    mockNotifyUser.mockResolvedValue(undefined);
    mockOwnerOfNote.mockResolvedValue({ success: true, data: { username: "fccview" } });
    mockOwnerOfList.mockResolvedValue({ success: true, data: { username: "fccview" } });
  });

  describe("share codes", () => {
    it("maps every code to its permission set", () => {
      expect(permsFromCode(SharePerms.READ)).toEqual(READ_ONLY);
      expect(permsFromCode(SharePerms.WRITE)).toEqual(WRITABLE);
      expect(permsFromCode(SharePerms.DELETE)).toEqual(FULL);
    });

    it("returns null for an unknown code", () => {
      expect(permsFromCode("rwx")).toBeNull();
    });

    it("round-trips permissions through a code", () => {
      expect(codeFromPerms(READ_ONLY)).toBe(SharePerms.READ);
      expect(codeFromPerms(WRITABLE)).toBe(SharePerms.WRITE);
      expect(codeFromPerms(FULL)).toBe(SharePerms.DELETE);
    });
  });

  describe("parseSharedWith", () => {
    it("returns null when the key is absent, meaning inherit", () => {
      expect(parseSharedWith(undefined)).toBeNull();
      expect(parseSharedWith(null)).toBeNull();
    });

    it("reads a single-line comma string", () => {
      expect(parseSharedWith("jodi:rw, bob:r")).toEqual({
        optedOut: false,
        users: { jodi: WRITABLE, bob: READ_ONLY },
      });
    });

    it("stays tolerant of a hand-written yaml array", () => {
      expect(parseSharedWith(["jodi:rwd"])).toEqual({
        optedOut: false,
        users: { jodi: FULL },
      });
    });

    it("treats a bare username as read-only", () => {
      expect(parseSharedWith("jodi")).toEqual({
        optedOut: false,
        users: { jodi: READ_ONLY },
      });
    });

    it("reads none as an explicit opt-out", () => {
      expect(parseSharedWith("none")).toEqual({ optedOut: true, users: {} });
    });

    it("recognises the public pseudo-user", () => {
      const parsed = parseSharedWith("public:r");

      expect(parsed?.users[PUBLIC_USER]).toEqual(READ_ONLY);
      expect(isPublicUser(PUBLIC_USER)).toBe(true);
      expect(isPublicUser("jodi")).toBe(false);
    });
  });

  describe("toSharedWith", () => {
    it("writes a single line so one grep can find it", () => {
      const line = toSharedWith({ jodi: WRITABLE, bob: READ_ONLY });

      expect(line).toBe("jodi:rw, bob:r");
      expect(line).not.toContain("\n");
    });

    it("writes none when no grants remain", () => {
      expect(toSharedWith({})).toBe("none");
    });

    it("round-trips through the parser", () => {
      const users = { jodi: FULL, bob: READ_ONLY };

      expect(parseSharedWith(toSharedWith(users))?.users).toEqual(users);
    });
  });

  describe("mountName", () => {
    it("keeps the owner folder name when it is free", () => {
      expect(
        mountName({ displayName: "Work", owner: "fccview" }, ["Personal"]),
      ).toBe("Work");
    });

    it("disambiguates with the owner on a collision", () => {
      expect(mountName({ displayName: "Work", owner: "fccview" }, ["Work"])).toBe(
        "Work (fccview)",
      );
    });
  });

  describe("resolveAccess", () => {
    it("returns no grants for an unshared file", async () => {
      const access = await resolveAccess(Modes.NOTES, WORK_FILE);

      expect(access?.owner).toBe("fccview");
      expect(access?.users).toEqual({});
      expect(access?.isPublic).toBe(false);
    });

    it("returns null for a path outside the mode directory", async () => {
      const access = await resolveAccess(Modes.NOTES, "/etc/passwd");

      expect(access).toBeNull();
    });

    it("inherits grants from the containing category", async () => {
      withCatInfo({
        [WORK_DIR]: {
          uuid: "work-uuid",
          sharing: { users: { jodi: WRITABLE } },
        },
      });

      const access = await resolveAccess(Modes.NOTES, WORK_FILE);

      expect(access?.users).toEqual({ jodi: WRITABLE });
      expect(access?.inherited).toBe(true);
      expect(access?.viaCategory).toBe("Work");
    });

    it("unions grants up the whole chain, widest permission winning", async () => {
      withCatInfo({
        [NESTED_DIR]: { sharing: { users: { jodi: READ_ONLY } } },
        [WORK_DIR]: { sharing: { users: { jodi: FULL, bob: READ_ONLY } } },
      });

      const access = await resolveAccess(Modes.NOTES, NESTED_FILE);

      expect(access?.users).toEqual({ jodi: FULL, bob: READ_ONLY });
    });

    it("stops climbing at inherit:false but keeps that folder's own grants", async () => {
      withCatInfo({
        [NESTED_DIR]: {
          sharing: { users: { bob: READ_ONLY }, inherit: false },
        },
        [WORK_DIR]: { sharing: { users: { jodi: FULL } } },
      });

      const access = await resolveAccess(Modes.NOTES, NESTED_FILE);

      expect(access?.users).toEqual({ bob: READ_ONLY });
      expect(access?.users.jodi).toBeUndefined();
    });

    it("lets explicit frontmatter override the inherited chain", async () => {
      withCatInfo({ [WORK_DIR]: { sharing: { users: { jodi: FULL } } } });
      mockGrepExtractFrontmatter.mockResolvedValue({ sharedWith: "bob:r" });

      const access = await resolveAccess(Modes.NOTES, WORK_FILE);

      expect(access?.users).toEqual({ bob: READ_ONLY });
      expect(access?.inherited).toBe(false);
    });

    it("honours a per-file none opt-out inside a shared folder", async () => {
      withCatInfo({ [WORK_DIR]: { sharing: { users: { jodi: FULL } } } });
      mockGrepExtractFrontmatter.mockResolvedValue({ sharedWith: "none" });

      const access = await resolveAccess(Modes.NOTES, WORK_FILE);

      expect(access?.users).toEqual({});
      expect(access?.inherited).toBe(false);
    });

    it("flags a file made public by inheritance", async () => {
      withCatInfo({
        [WORK_DIR]: { sharing: { users: { [PUBLIC_USER]: READ_ONLY } } },
      });

      const access = await resolveAccess(Modes.NOTES, WORK_FILE);

      expect(access?.isPublic).toBe(true);
    });
  });

  describe("catAccess", () => {
    it("resolves grants for a category directory itself", async () => {
      withCatInfo({ [WORK_DIR]: { sharing: { users: { jodi: WRITABLE } } } });

      const access = await catAccess(Modes.NOTES, NESTED_DIR);

      expect(access?.owner).toBe("fccview");
      expect(access?.users).toEqual({ jodi: WRITABLE });
    });
  });

  describe("canReachFile", () => {
    it("always lets the owner through", async () => {
      const allowed = await canReachFile(
        Modes.NOTES,
        WORK_FILE,
        "fccview",
        PermissionTypes.DELETE,
      );

      expect(allowed).toBe(true);
    });

    it("refuses a stranger", async () => {
      const allowed = await canReachFile(
        Modes.NOTES,
        WORK_FILE,
        "bob",
        PermissionTypes.READ,
      );

      expect(allowed).toBe(false);
    });

    it("grants exactly the inherited permission level", async () => {
      withCatInfo({ [WORK_DIR]: { sharing: { users: { jodi: WRITABLE } } } });

      await expect(
        canReachFile(Modes.NOTES, WORK_FILE, "jodi", PermissionTypes.READ),
      ).resolves.toBe(true);
      await expect(
        canReachFile(Modes.NOTES, WORK_FILE, "jodi", PermissionTypes.EDIT),
      ).resolves.toBe(true);
      await expect(
        canReachFile(Modes.NOTES, WORK_FILE, "jodi", PermissionTypes.DELETE),
      ).resolves.toBe(false);
    });

    it("refuses a recipient once the file opts out", async () => {
      withCatInfo({ [WORK_DIR]: { sharing: { users: { jodi: FULL } } } });
      mockGrepExtractFrontmatter.mockResolvedValue({ sharedWith: "none" });

      const allowed = await canReachFile(
        Modes.NOTES,
        WORK_FILE,
        "jodi",
        PermissionTypes.READ,
      );

      expect(allowed).toBe(false);
    });
  });

  describe("canReach", () => {
    it("lets an admin through without touching the tree", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockCanAccessAllContent.mockResolvedValue(true);

      const allowed = await canReach(
        "some-uuid",
        ItemTypes.NOTE,
        "admin",
        PermissionTypes.DELETE,
      );

      expect(allowed).toBe(true);
      expect(mockGrepFindFileByUuid).not.toHaveBeenCalled();
    });

    it("refuses an admin once content access is switched off", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockCanAccessAllContent.mockResolvedValue(false);
      mockGrepFindFileByUuid.mockResolvedValue({ filePath: WORK_FILE });

      const allowed = await canReach(
        "note-uuid",
        ItemTypes.NOTE,
        "admin",
        PermissionTypes.READ,
      );

      expect(allowed).toBe(false);
    });

    it("refuses when there is no username", async () => {
      const allowed = await canReach(
        "some-uuid",
        ItemTypes.NOTE,
        "",
        PermissionTypes.READ,
      );

      expect(allowed).toBe(false);
    });

    it("refuses when the uuid resolves to no file", async () => {
      const allowed = await canReach(
        "missing-uuid",
        ItemTypes.NOTE,
        "jodi",
        PermissionTypes.READ,
      );

      expect(allowed).toBe(false);
    });

    it("resolves the uuid then defers to the file chain", async () => {
      mockGrepFindFileByUuid.mockResolvedValue({ filePath: WORK_FILE });
      withCatInfo({ [WORK_DIR]: { sharing: { users: { jodi: WRITABLE } } } });

      await expect(
        canReach("note-uuid", ItemTypes.NOTE, "jodi", PermissionTypes.EDIT),
      ).resolves.toBe(true);
      await expect(
        canReach("note-uuid", ItemTypes.NOTE, "bob", PermissionTypes.READ),
      ).resolves.toBe(false);
    });
  });

  describe("isPublicItem", () => {
    it("is true only when the resolved access is public", async () => {
      mockGrepFindFileByUuid.mockResolvedValue({ filePath: WORK_FILE });
      mockGrepExtractFrontmatter.mockResolvedValue({ sharedWith: "public:r" });

      await expect(isPublicItem("note-uuid", ItemTypes.NOTE)).resolves.toBe(
        true,
      );

      mockGrepExtractFrontmatter.mockResolvedValue({ sharedWith: "jodi:r" });

      await expect(isPublicItem("note-uuid", ItemTypes.NOTE)).resolves.toBe(
        false,
      );
    });
  });

  describe("listMounts", () => {
    it("returns nothing when the user has no shares", async () => {
      await expect(listMounts(Modes.NOTES, "jodi")).resolves.toEqual([]);
    });

    it("mounts a shared category and skips the recipient's own tree", async () => {
      withGrepHits(
        [
          path.join(WORK_DIR, CATEGORY_INFO_FILE),
          path.join(NOTES_DIR, "jodi", "Mine", CATEGORY_INFO_FILE),
        ],
        [],
      );
      withCatInfo({
        [WORK_DIR]: {
          uuid: "work-uuid",
          sharing: { users: { jodi: WRITABLE } },
        },
      });

      const mounts = await listMounts(Modes.NOTES, "jodi");

      expect(mounts).toHaveLength(1);
      expect(mounts[0]).toMatchObject({
        owner: "fccview",
        categoryUuid: "work-uuid",
        categoryPath: "Work",
        displayName: "Work",
        permissions: WRITABLE,
        isImplicit: false,
      });
    });

    it("keeps only the topmost folder when a subfolder is also granted", async () => {
      withGrepHits(
        [
          path.join(WORK_DIR, CATEGORY_INFO_FILE),
          path.join(NESTED_DIR, CATEGORY_INFO_FILE),
        ],
        [],
      );
      withCatInfo({
        [WORK_DIR]: {
          uuid: "work-uuid",
          sharing: { users: { jodi: WRITABLE } },
        },
        [NESTED_DIR]: {
          uuid: "nested-uuid",
          sharing: { users: { jodi: WRITABLE } },
        },
      });

      const mounts = await listMounts(Modes.NOTES, "jodi");

      expect(mounts.map((mount) => mount.categoryUuid)).toEqual(["work-uuid"]);
    });

    it("ignores a candidate folder whose grants only substring-match the user", async () => {
      withGrepHits([path.join(WORK_DIR, CATEGORY_INFO_FILE)], []);
      withCatInfo({
        [WORK_DIR]: {
          uuid: "work-uuid",
          sharing: { users: { jodinah: WRITABLE } },
        },
      });

      await expect(listMounts(Modes.NOTES, "jodi")).resolves.toEqual([]);
    });

    it("collects loose explicit file shares into one implicit mount per sharer", async () => {
      withGrepHits([], [WORK_FILE]);
      mockGrepExtractFrontmatter.mockResolvedValue({
        uuid: "note-uuid",
        sharedWith: "jodi:r",
      });

      const mounts = await listMounts(Modes.NOTES, "jodi");

      expect(mounts).toHaveLength(1);
      expect(mounts[0]).toMatchObject({
        owner: "fccview",
        displayName: "fccview",
        isImplicit: true,
        itemUuids: ["note-uuid"],
      });
    });

    it("does not create an implicit mount for a file already inside a mount", async () => {
      withGrepHits([path.join(WORK_DIR, CATEGORY_INFO_FILE)], [WORK_FILE]);
      withCatInfo({
        [WORK_DIR]: {
          uuid: "work-uuid",
          sharing: { users: { jodi: WRITABLE } },
        },
      });

      const mounts = await listMounts(Modes.NOTES, "jodi");

      expect(mounts).toHaveLength(1);
      expect(mounts[0].isImplicit).toBe(false);
    });
  });

  describe("sharersOf", () => {
    it("lists each owner once", async () => {
      withGrepHits(
        [
          path.join(WORK_DIR, CATEGORY_INFO_FILE),
          path.join(NOTES_DIR, "bob", "Docs", CATEGORY_INFO_FILE),
        ],
        [],
      );
      mockReadCatInfo.mockImplementation(async (dir: string) => ({
        uuid: `${path.basename(dir)}-uuid`,
        sharing: { users: { jodi: READ_ONLY } },
      }));

      const sharers = await sharersOf(Modes.NOTES, "jodi");

      expect(sharers.sort()).toEqual(["bob", "fccview"]);
    });
  });

  describe("folder sharing by uuid", () => {
    it("resolves the folder from its uuid and writes the grant there", async () => {
      const result = await shareFolder(
        Modes.NOTES,
        "fccview",
        "work-uuid",
        "jodi",
        READ_ONLY,
      );

      expect(result.success).toBe(true);
      expect(mockCatDirByUuid).toHaveBeenCalledWith(OWNER_DIR, "work-uuid");
      expect(mockWriteCatInfo).toHaveBeenCalledWith(
        WORK_DIR,
        expect.objectContaining({
          uuid: "work-uuid",
          sharing: { users: { jodi: READ_ONLY }, inherit: true },
        }),
      );
    });

    it("cannot be pointed outside the owner's tree by a traversal string", async () => {
      mockCatDirByUuid.mockResolvedValue(null);

      const result = await shareFolder(
        Modes.NOTES,
        "fccview",
        "../../jodi/Secrets",
        "fccview",
        FULL,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Category not found");
      expect(mockWriteCatInfo).not.toHaveBeenCalled();
    });

    it("refuses an empty uuid without touching the disk", async () => {
      const result = await shareFolder(Modes.NOTES, "fccview", "", "jodi");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Category not found");
      expect(mockCatDirByUuid).not.toHaveBeenCalled();
      expect(mockWriteCatInfo).not.toHaveBeenCalled();
    });

    it("keeps setFolderInherit scoped to the resolved folder", async () => {
      const result = await setFolderInherit(
        Modes.NOTES,
        "fccview",
        "work-uuid",
        false,
      );

      expect(result.success).toBe(true);
      expect(mockWriteCatInfo).toHaveBeenCalledWith(
        WORK_DIR,
        expect.objectContaining({
          uuid: "work-uuid",
          sharing: { users: {}, inherit: false },
        }),
      );
    });

    it("un-publishing a folder drops only the public grant", async () => {
      mockReadCatInfo.mockResolvedValue({
        uuid: "work-uuid",
        sharing: { users: { jodi: READ_ONLY, [PUBLIC_USER]: READ_ONLY } },
      });

      const result = await setFolderPublic(
        Modes.NOTES,
        "fccview",
        "work-uuid",
        false,
      );

      expect(result.success).toBe(true);
      expect(mockWriteCatInfo).toHaveBeenCalledWith(
        WORK_DIR,
        expect.objectContaining({
          sharing: { users: { jodi: READ_ONLY }, inherit: true },
        }),
      );
    });
  });

  describe("owner guard", () => {
    it("refuses a sharing write from someone who is not the owner", async () => {
      mockGetUsername.mockResolvedValue("jodi");

      const result = await shareItem(Modes.NOTES, "note-uuid", "bob");

      expect(result.success).toBe(false);
      expect(result.error).toBe("You shall not pass");
      expect(mockServerWriteFile).not.toHaveBeenCalled();
    });

    it("refuses a folder unshare when the caller claims someone else's tree", async () => {
      mockGetUsername.mockResolvedValue("jodi");

      const result = await unshareFolder(
        Modes.NOTES,
        "fccview",
        "work-uuid",
        "bob",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("You shall not pass");
      expect(mockWriteCatInfo).not.toHaveBeenCalled();
    });

    it("lets an admin through", async () => {
      mockGetUsername.mockResolvedValue("jodi");
      mockIsAdmin.mockResolvedValue(true);
      mockGrepFindFileByUuid.mockResolvedValue({ filePath: WORK_FILE });

      const result = await shareItem(Modes.NOTES, "note-uuid", "bob");

      expect(result.success).toBe(true);
    });

    it("lets the owner through", async () => {
      mockGrepFindFileByUuid.mockResolvedValue({ filePath: WORK_FILE });

      const result = await shareItem(Modes.NOTES, "note-uuid", "bob");

      expect(result.success).toBe(true);
    });
  });

  describe("leaveItem", () => {
    beforeEach(() => {
      mockGetUsername.mockResolvedValue("jodi");
      mockGrepFindFileByUuid.mockResolvedValue({ filePath: WORK_FILE });
    });

    it("drops only the caller from an explicit share", async () => {
      mockGrepExtractFrontmatter.mockResolvedValue({
        sharedWith: "jodi:rw, bob:r",
      });

      const result = await leaveItem(Modes.NOTES, "note-uuid");

      expect(result.success).toBe(true);
      expect(mockServerWriteFile.mock.calls[0][1]).toContain("bob:r");
      expect(mockServerWriteFile.mock.calls[0][1]).not.toContain("jodi");
    });

    it("materialises an inherited grant minus the caller", async () => {
      withCatInfo({
        [WORK_DIR]: { sharing: { users: { jodi: WRITABLE, bob: READ_ONLY } } },
      });

      const result = await leaveItem(Modes.NOTES, "note-uuid");

      expect(result.success).toBe(true);
      expect(mockServerWriteFile.mock.calls[0][1]).toContain("bob:r");
      expect(mockServerWriteFile.mock.calls[0][1]).not.toContain("jodi");
    });

    it("writes none when the caller was the only recipient", async () => {
      mockGrepExtractFrontmatter.mockResolvedValue({ sharedWith: "jodi:rw" });

      await leaveItem(Modes.NOTES, "note-uuid");

      expect(mockServerWriteFile.mock.calls[0][1]).toContain("none");
    });

    it("refuses when the item is not shared with the caller", async () => {
      mockGrepExtractFrontmatter.mockResolvedValue({ sharedWith: "bob:r" });

      const result = await leaveItem(Modes.NOTES, "note-uuid");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not shared with you");
      expect(mockServerWriteFile).not.toHaveBeenCalled();
    });

    it("refuses when the caller owns the item", async () => {
      mockGetUsername.mockResolvedValue("fccview");

      const result = await leaveItem(Modes.NOTES, "note-uuid");

      expect(result.success).toBe(false);
      expect(result.error).toBe("You own this item");
      expect(mockServerWriteFile).not.toHaveBeenCalled();
    });

    it("tells both the owner and the leaver", async () => {
      mockGrepExtractFrontmatter.mockResolvedValue({ sharedWith: "jodi:rw" });

      await leaveItem(Modes.NOTES, "note-uuid");

      expect(mockBroadcast.mock.calls.map((call) => call[0].username).sort()).toEqual(
        ["fccview", "jodi"],
      );
    });
  });

  describe("leaveFolder", () => {
    beforeEach(() => {
      mockGetUsername.mockResolvedValue("jodi");
    });

    it("drops the caller from a grant made at that folder", async () => {
      withCatInfo({
        [WORK_DIR]: {
          uuid: "work-uuid",
          sharing: { users: { jodi: WRITABLE, bob: READ_ONLY } },
        },
      });

      const result = await leaveFolder(Modes.NOTES, "fccview", "work-uuid");

      expect(result.success).toBe(true);

      const written = mockWriteCatInfo.mock.calls[0][1];
      expect(written.sharing.users).toEqual({ bob: READ_ONLY });
      expect(written.sharing.inherit).toBe(true);
    });

    it("cuts inheritance when the grant comes from an ancestor", async () => {
      mockCatDirByUuid.mockResolvedValue(NESTED_DIR);
      withCatInfo({
        [WORK_DIR]: { sharing: { users: { jodi: WRITABLE, bob: READ_ONLY } } },
      });

      const result = await leaveFolder(Modes.NOTES, "fccview", "nested-uuid");

      expect(result.success).toBe(true);

      const written = mockWriteCatInfo.mock.calls[0][1];
      expect(written.sharing.users).toEqual({ bob: READ_ONLY });
      expect(written.sharing.inherit).toBe(false);
    });

    it("refuses when the folder is not shared with the caller", async () => {
      withCatInfo({
        [WORK_DIR]: { uuid: "work-uuid", sharing: { users: { bob: READ_ONLY } } },
      });

      const result = await leaveFolder(Modes.NOTES, "fccview", "work-uuid");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not shared with you");
      expect(mockWriteCatInfo).not.toHaveBeenCalled();
    });

    it("refuses when the caller owns the folder", async () => {
      mockGetUsername.mockResolvedValue("fccview");

      const result = await leaveFolder(Modes.NOTES, "fccview", "work-uuid");

      expect(result.success).toBe(false);
      expect(result.error).toBe("You own this folder");
      expect(mockWriteCatInfo).not.toHaveBeenCalled();
    });

    it("never touches the owner's files, only the grant", async () => {
      withCatInfo({
        [WORK_DIR]: { uuid: "work-uuid", sharing: { users: { jodi: WRITABLE } } },
      });

      await leaveFolder(Modes.NOTES, "fccview", "work-uuid");

      expect(mockServerWriteFile).not.toHaveBeenCalled();
      expect(mockWriteCatInfo.mock.calls[0][0]).toBe(WORK_DIR);
    });
  });
});
