import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetAllMocks, createFormData } from "../setup";

const mockServerWriteFile = vi.fn();
const mockServerDeleteFile = vi.fn();
const mockGetListById = vi.fn();
const mockGetNoteById = vi.fn();

vi.mock("@/app/_server/actions/file", () => ({
  ensureDir: vi.fn().mockResolvedValue(undefined),
  serverWriteFile: (...args: any[]) => mockServerWriteFile(...args),
  serverDeleteFile: (...args: any[]) => mockServerDeleteFile(...args),
}));

vi.mock("@/app/_server/actions/checklist/queries", () => ({
  getListById: (...args: any[]) => mockGetListById(...args),
}));

vi.mock("@/app/_server/actions/note/queries", () => ({
  getNoteById: (...args: any[]) => mockGetNoteById(...args),
}));

vi.mock("@/app/_server/actions/share/queries", () => ({
  canReach: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/app/_server/actions/share/target", () => ({
  targetDir: async (_mode: unknown, owner: string, category: string) => ({
    dir: `/data/${owner}/${category}`,
    owner,
    category,
    isMount: false,
    isImplicit: false,
  }),
  bouncer: async () => ({ allowed: true }),
  shownAs: async (_m: unknown, _u: string, _o: string, category: string) =>
    category,
  movePlan: async (
    _mode: unknown,
    owner: string,
    item: { category?: string },
    category: string,
  ) => ({
    home: { owner, category: item.category || "" },
    destination: { owner, category },
    target: { dir: `/data/${owner}/${category}`, owner, category },
    isMoving: false,
  }),
  refusalMessage: async () => "requiredPermissions",
}));

vi.mock("@/app/_server/actions/log", () => ({
  logContentEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/history/repo", () => ({
  commitNote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/relations/tidy", () => ({
  tidyItemLinks: async (content: string) => content,
  refreshWikilinks: (content: string) => content,
}));

vi.mock("@/app/_utils/filename-utils", () => ({
  generateUniqueFilename: vi.fn().mockResolvedValue("shopping.md"),
  sanitizeFilename: vi.fn().mockReturnValue("shopping"),
}));

import { dropList, editList } from "@/app/_server/actions/checklist/editor";
import { dropNote, editNote } from "@/app/_server/actions/note/editor";

const actor = { username: "testuser", fileRenameMode: "minimal" } as any;

const storedItem = {
  id: "shopping",
  uuid: "lane-uuid-1",
  title: "Shopping",
  category: "Home",
  owner: "testuser",
  content: "Milk",
  items: [],
};

describe("item lane: edit and delete on one item", () => {
  let disk: Map<string, string>;

  const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

  const readItem = async () => {
    const exists = disk.size > 0;
    await settle();
    return exists ? structuredClone(storedItem) : null;
  };

  beforeEach(() => {
    resetAllMocks();
    disk = new Map([["/data/testuser/Home/shopping.md", "stored"]]);
    mockGetListById.mockImplementation(readItem);
    mockGetNoteById.mockImplementation(readItem);
    mockServerWriteFile.mockImplementation(
      async (filePath: string, content: string) => {
        await settle();
        disk.set(filePath, content);
      },
    );
    mockServerDeleteFile.mockImplementation(async () => {
      await settle();
      disk.clear();
    });
  });

  const listForm = () =>
    createFormData({ uuid: "lane-uuid-1", title: "Shopping", category: "Home" });

  const noteForm = () =>
    createFormData({
      uuid: "lane-uuid-1",
      title: "Shopping",
      category: "Home",
      content: "Milk and eggs",
    });

  it("should not bring a checklist back when an edit races its delete", async () => {
    const [edited, dropped] = await Promise.all([
      editList(actor, listForm()),
      dropList(actor, listForm()),
    ]);

    expect(edited.success).toBe(true);
    expect(dropped.success).toBe(true);
    expect(disk.size).toBe(0);
  });

  it("should not recreate a checklist when the delete lands first", async () => {
    await Promise.all([dropList(actor, listForm()), editList(actor, listForm())]);

    expect(disk.size).toBe(0);
  });

  it("should not bring a note back when an edit races its delete", async () => {
    const [edited, dropped] = await Promise.all([
      editNote(actor, noteForm()),
      dropNote(actor, noteForm()),
    ]);

    expect(edited.success).toBe(true);
    expect(dropped.success).toBe(true);
    expect(disk.size).toBe(0);
  });

  it("should not recreate a note when the delete lands first", async () => {
    await Promise.all([dropNote(actor, noteForm()), editNote(actor, noteForm())]);

    expect(disk.size).toBe(0);
  });
});
