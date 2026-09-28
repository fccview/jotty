import { describe, it, expect, beforeEach, vi } from "vitest";
import path from "path";
import { resetAllMocks, createFormData } from "../setup";
import { NOTES_DIR } from "@/app/_consts/files";

const disk = new Map<string, string>();
const notes = new Map<string, Record<string, unknown>>();

vi.mock("@/app/_server/actions/file", () => ({
  ensureDir: vi.fn().mockResolvedValue(undefined),
  serverWriteFile: async (filePath: string, content: string) => {
    disk.set(filePath, content);
  },
  serverDeleteFile: async (filePath: string) => {
    disk.delete(filePath);
  },
}));

vi.mock("@/app/_server/actions/note/queries", () => ({
  getNoteById: async (uuid: string) => notes.get(uuid),
}));

vi.mock("@/app/_server/actions/share/queries", () => ({
  canReach: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/app/_server/actions/share/target", () => ({
  bouncer: async () => ({ allowed: true }),
  shownAs: async (_m: unknown, _u: string, _o: string, category: string) => category,
  movePlan: async (_mode: unknown, owner: string, item: { category?: string }, requested: string) => {
    const home = { owner, category: item.category || "" };
    const destination = { owner, category: requested };
    return { home, destination, target: destination, isMoving: requested !== home.category };
  },
  refusalMessage: async () => "requiredPermissions",
}));

vi.mock("@/app/_server/actions/lib/read-only", () => ({
  isWritable: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logContentEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/history", () => ({
  commitNote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/relations/tidy", () => ({
  tidyItemLinks: async (content: string) => content,
  refreshWikilinks: (content: string) => content,
}));

vi.mock("@/app/_utils/filename-utils", () => ({
  generateUniqueFilename: vi.fn(),
  freeFilename: async (dir: string, id: string) => {
    for (let counter = 0; ; counter++) {
      const name = counter ? `${id}-${counter}.md` : `${id}.md`;
      if (!disk.has(path.join(dir, name))) return name;
    }
  },
}));

import { editNote } from "@/app/_server/actions/note/editor";

const actor = { username: "alice", fileRenameMode: "minimal" } as never;
const dirOf = (category: string) => path.join(process.cwd(), NOTES_DIR("alice"), category);

const seed = (uuid: string, category: string, content: string) => {
  const note = { id: "overview", uuid, title: "Overview", category, owner: "alice", content };
  notes.set(uuid, note);
  disk.set(path.join(dirOf(category), "overview.md"), content);
};

describe("notes never land on top of each other", () => {
  beforeEach(() => {
    resetAllMocks();
    disk.clear();
    notes.clear();
  });

  it("gives a moved note a free filename instead of overwriting a namesake", async () => {
    seed("n-1", "Homelab/Neovim", "Neovim things");
    seed("n-2", "Uncategorized", "Hyprland things");

    const result = await editNote(
      actor,
      createFormData({ uuid: "n-1", title: "Overview", category: "Uncategorized", content: "Neovim things" }),
    );

    expect(result).toMatchObject({ success: true, data: { id: "overview-1" } });
    expect(disk.get(path.join(dirOf("Uncategorized"), "overview.md"))).toBe("Hyprland things");
    expect(disk.get(path.join(dirOf("Uncategorized"), "overview-1.md"))).toContain("Neovim things");
    expect(disk.has(path.join(dirOf("Homelab/Neovim"), "overview.md"))).toBe(false);
  });
});
