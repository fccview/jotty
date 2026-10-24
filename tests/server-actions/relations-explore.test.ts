import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import nodeFs from "fs";
import os from "os";
import path from "path";
import { mockFs, resetAllMocks } from "../setup";
import { ItemTypes } from "@/app/_types/enums";
import { LinkStyles, RelationsStatus } from "@/app/_consts/relations";
import { SearchModes } from "@/app/_consts/search";
import type { SanitisedUser } from "@/app/_types";

vi.unmock("unified");
vi.unmock("unist-util-visit");
vi.unmock("@/app/_utils/checklist-utils");

const mockNotes = vi.fn();
const mockChecklists = vi.fn();
const mockSettings = vi.fn();
const mockCanReach = vi.fn();
const mockRewrite = vi.fn();
const mockGrep = vi.fn();

vi.mock("@/app/_server/actions/ws/broadcast", () => ({ broadcast: vi.fn() }));
vi.mock("@/app/_server/actions/note/queries", () => ({ getUserNotes: () => mockNotes() }));
vi.mock("@/app/_server/actions/checklist/queries", () => ({
  getUserChecklists: () => mockChecklists(),
}));
vi.mock("@/app/_server/actions/config", () => ({ getSettings: () => mockSettings() }));
vi.mock("@/app/_server/actions/share/queries", () => ({
  canReach: (...args: unknown[]) => mockCanReach(...args),
  isLockedUuid: async () => false,
}));
vi.mock("@/app/_server/actions/note/splice", () => ({
  spliceNote: (...args: unknown[]) => mockRewrite(...args),
}));
vi.mock("@/app/_utils/grep-utils", () => ({
  grepSearchContent: (...args: unknown[]) => mockGrep(...args),
  grepExtractFrontmatter: vi.fn().mockResolvedValue({ title: "Grepped", uuid: "g-1" }),
}));

import { indexItemFile } from "@/app/_server/actions/relations/indexer";
import { closeRelationsDb, setRelationsStatus } from "@/app/_server/actions/relations/store";
import { backlinksFor } from "@/app/_server/actions/relations/queries";
import {
  LINK_MISSING,
  LINKS_OFF,
  MENTION_MISSING,
  NOT_VISIBLE,
  linkItems,
  neighbourhoodFor,
  orphansFor,
  relatedFor,
  unlinkItems,
} from "@/app/_server/actions/relations/explore";
import { searchItems } from "@/app/_server/actions/search/engine";

const A = "aaaaaaaa-1111-4222-8333-944455556666";
const B = "bbbbbbbb-1111-4222-8333-944455556666";
const C = "cccccccc-1111-4222-8333-944455556666";
const D = "dddddddd-1111-4222-8333-944455556666";
const L = "eeeeeeee-1111-4222-8333-944455556666";
const BOB = "ffffffff-1111-4222-8333-944455556666";

const alice = { username: "alice" } as SanitisedUser;

let root: string;

const itemPath = (mode: string, owner: string, rel: string) =>
  path.join(root, "data", mode, owner, rel);

const doc = (uuid: string, title: string, body: string, extra = "") =>
  `---\nuuid: ${uuid}\ntitle: ${title}\n${extra}---\n\n${body}`;

const write = (filePath: string, content: string) => {
  nodeFs.mkdirSync(path.dirname(filePath), { recursive: true });
  nodeFs.writeFileSync(filePath, content);
  indexItemFile(filePath, content, Math.floor(nodeFs.statSync(filePath).mtimeMs));
};

const meta = (uuid: string, title: string, tags: string[] = []) => ({
  uuid,
  title,
  category: "Home",
  owner: "alice",
  tags,
});

const seed = () => {
  write(itemPath("notes", "alice", "Home/curry.md"), doc(A, "Weeknight curry", "Onions, garlic, a tin of tomatoes."));
  write(
    itemPath("notes", "alice", "Home/meals.md"),
    doc(B, "Meal plan", `Monday is [Weeknight curry](/note/${A}). Tuesday [[Soup ideas]].`),
  );
  write(itemPath("notes", "alice", "Home/stray.md"), doc(C, "Stray thought", "Nothing links here.", "tags: [home]\n"));
  write(
    itemPath("notes", "alice", "Home/diary.md"),
    doc(D, "Diary", "cipher text curry", "encrypted: true\n"),
  );
  write(
    itemPath("checklists", "alice", "Home/shop.md"),
    doc(L, "Shopping", `- [ ] Tomatoes for the curry\n- [ ] Rice\n- [ ] Read the [Meal plan](/note/${B})`),
  );
  write(itemPath("notes", "bob", "curry.md"), doc(BOB, "Bob curry", "curry curry curry"));

  mockNotes.mockResolvedValue({
    success: true,
    data: [meta(A, "Weeknight curry"), meta(B, "Meal plan"), meta(C, "Stray thought", ["home"]), meta(D, "Diary")],
  });
  mockChecklists.mockResolvedValue({ success: true, data: [meta(L, "Shopping")] });
};

const useRealFs = async () => {
  const real = await vi.importActual<typeof import("fs/promises")>("fs/promises");
  mockFs.readFile.mockImplementation(real.readFile as never);
  mockFs.writeFile.mockImplementation(real.writeFile as never);
  mockFs.stat.mockImplementation(real.stat as never);
  mockFs.mkdir.mockImplementation(real.mkdir as never);
};

describe("relations explore", () => {
  beforeEach(async () => {
    resetAllMocks();
    await useRealFs();
    root = nodeFs.mkdtempSync(path.join(os.tmpdir(), "jotty-explore-"));
    vi.spyOn(process, "cwd").mockReturnValue(root);
    process.env.JOTTY_RELATIONS_DB = path.join(root, "relations.db");
    closeRelationsDb();
    setRelationsStatus(RelationsStatus.READY);
    mockSettings.mockResolvedValue({ editor: { enableBilateralLinks: true } });
    mockCanReach.mockResolvedValue(true);
    mockGrep.mockReset().mockResolvedValue([]);
    seed();
  });

  afterEach(() => {
    closeRelationsDb();
    vi.restoreAllMocks();
    nodeFs.rmSync(root, { recursive: true, force: true });
  });

  describe("search", () => {
    const titles = async (query: string, mode = SearchModes.RANKED) =>
      (await searchItems("alice", query, { mode })).hits.map((hit) => hit.title);

    it("finds the words in any order and ranks the title match first", async () => {
      expect((await titles("curry weeknight"))[0]).toBe("Weeknight curry");
    });

    it("searches checklist items and link text across both types", async () => {
      const found = await titles("curry");
      expect(found).toEqual(expect.arrayContaining(["Weeknight curry", "Meal plan", "Shopping"]));
    });

    it("keeps to the caller's own unencrypted items", async () => {
      const found = await titles("curry");
      expect(found).not.toContain("Bob curry");
      expect(found).not.toContain("Diary");
    });

    it("returns the slug and category from the file path", async () => {
      const { hits } = await searchItems("alice", "stray", { mode: SearchModes.RANKED });
      expect(hits[0]).toMatchObject({ uuid: C, slug: "stray", category: "Home", type: ItemTypes.NOTE });
    });

    it("fills a smart search with exact-text hits the index missed, without repeats", async () => {
      mockGrep.mockImplementation(async (dir: string) =>
        dir.includes("notes")
          ? [
              { filePath: itemPath("notes", "alice", "Home/curry.md"), id: "curry", category: "Home", matchLine: "" },
              { filePath: itemPath("notes", "alice", "Home/odd.md"), id: "odd", category: "Home", matchLine: "curryish" },
            ]
          : [],
      );
      const { hits } = await searchItems("alice", "curry", { mode: SearchModes.SMART });
      expect(hits.filter((hit) => hit.slug === "curry")).toHaveLength(1);
      expect(hits[hits.length - 1].slug).toBe("odd");
    });

    it("uses only grep for substring and while the index builds in smart", async () => {
      await searchItems("alice", "curry", { mode: SearchModes.SUBSTRING });
      expect(mockGrep).toHaveBeenCalledTimes(2);

      setRelationsStatus(RelationsStatus.BUILDING);
      mockGrep.mockClear();
      const smart = await searchItems("alice", "curry", { mode: SearchModes.SMART });
      expect(mockGrep).toHaveBeenCalledTimes(2);
      expect(smart.indexing).toBe(false);
    });

    it("says it is indexing instead of guessing when ranked-only runs before the index is ready", async () => {
      setRelationsStatus(RelationsStatus.BUILDING);
      const ranked = await searchItems("alice", "curry", { mode: SearchModes.RANKED });
      expect(ranked).toEqual({ hits: [], indexing: true });
      expect(mockGrep).not.toHaveBeenCalled();
    });
  });

  it("only lists notes under Mentioned in, never checklists", () => {
    write(itemPath("notes", "alice", "Home/rice.md"), doc(C, "Rice", "plain"));
    const visible = new Map(
      [meta(C, "Rice"), meta(L, "Shopping")].map((item, i) => [
        item.uuid,
        { ...item, type: i ? ItemTypes.CHECKLIST : ItemTypes.NOTE },
      ]),
    );
    expect(backlinksFor(C, visible).mentions).toEqual([]);
  });

  describe("relatedFor", () => {
    it("lists backlinks, outgoing links and unwritten wikilinks", async () => {
      const result = await relatedFor(alice, B);
      expect(result.success).toBe(true);
      expect(result.data?.backlinks.map((item) => item.uuid)).toEqual([L]);
      expect(result.data?.links.map((item) => item.uuid)).toEqual([A]);
      expect(result.data?.unwritten).toEqual(["Soup ideas"]);
    });

    it("refuses items the caller can't see", async () => {
      expect(await relatedFor(alice, BOB)).toEqual({ success: false, error: NOT_VISIBLE });
    });

    it("says so when links are turned off", async () => {
      mockSettings.mockResolvedValue({ editor: { enableBilateralLinks: false } });
      expect(await relatedFor(alice, B)).toEqual({ success: false, error: LINKS_OFF });
    });
  });

  describe("neighbourhoodFor", () => {
    const base = { depth: 1, limit: 60, suggestions: false };

    it("walks out from the focus by depth", async () => {
      const near = await neighbourhoodFor(alice, { ...base, focus: A });
      expect(near.data?.nodes.map((node) => node.id).sort()).toEqual([A, B].sort());

      const far = await neighbourhoodFor(alice, { ...base, focus: A, depth: 2 });
      expect(far.data?.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([L, "ghost:soup ideas"]));
      expect(far.data?.nodes.find((node) => node.id === L)?.distance).toBe(2);
    });

    it("without a focus returns only linked items, most linked first, and flags a cut", async () => {
      const map = await neighbourhoodFor(alice, { ...base, limit: 1 });
      expect(map.data?.nodes.map((node) => node.id)).toEqual([B]);
      expect(map.data?.truncated).toBe(true);
      expect(map.data?.nodes.some((node) => node.id.startsWith("tag:"))).toBe(false);
    });
  });

  it("lists orphans, ignoring tags", async () => {
    const result = await orphansFor(alice, { limit: 25, offset: 0 });
    expect(result.data?.orphans.map((item) => item.uuid).sort()).toEqual([C, D].sort());
    expect(result.data?.total).toBe(2);
  });

  describe("suggestions", () => {
    it("says which shared neighbours a suggestion comes from", async () => {
      const result = await relatedFor(alice, A);
      expect(result.data?.suggestions).toEqual([
        expect.objectContaining({ uuid: L, title: "Shopping", via: ["Meal plan"] }),
      ]);
    });
  });

  describe("linkItems", () => {
    const spliced = { success: true, data: { uuid: A, title: "Alpha", category: "Home", tags: [], managed: false } };

    it("appends a link inside the source note's lane", async () => {
      mockRewrite.mockImplementation(async (_actor, _uuid, edit) => {
        expect(edit("Some text")).toEqual({ body: `Some text\n\n[Stray thought](/note/${C})\n` });
        expect(edit("Crlf text\r\n")).toEqual({ body: `Crlf text\r\n\r\n[Stray thought](/note/${C})\r\n` });
        return spliced;
      });
      expect(await linkItems(alice, A, C, LinkStyles.APPEND)).toEqual({ success: true, data: { managed: false } });
      expect(mockRewrite).toHaveBeenCalledWith(alice, A, expect.any(Function));
    });

    it("reports a missing mention without writing", async () => {
      mockRewrite.mockImplementation(async (_actor, _uuid, edit) => {
        const result = edit("Nothing relevant here");
        return { success: false, error: result.error };
      });
      expect(await linkItems(alice, A, C, LinkStyles.MENTION)).toEqual({ success: false, error: MENTION_MISSING });
    });

    it("passes on a managed source so the caller can warn", async () => {
      mockRewrite.mockResolvedValue({ ...spliced, data: { ...spliced.data, managed: true } });
      expect(await linkItems(alice, A, C, LinkStyles.APPEND)).toEqual({ success: true, data: { managed: true } });
    });

    it("refuses hidden targets, checklist sources and missing edit rights", async () => {
      expect((await linkItems(alice, A, BOB, LinkStyles.APPEND)).error).toBe(NOT_VISIBLE);
      expect((await linkItems(alice, L, A, LinkStyles.APPEND)).error).toBe(NOT_VISIBLE);
      mockCanReach.mockResolvedValue(false);
      expect((await linkItems(alice, A, C, LinkStyles.APPEND)).error).toBe("Permission denied");
      expect(mockRewrite).not.toHaveBeenCalled();
    });
  });

  describe("unlinkItems", () => {
    it("removes the links and counts the wikilinks it leaves", async () => {
      write(itemPath("notes", "alice", "a.md"), doc(A, "Alpha", "see [[Stray thought]]"));
      mockRewrite.mockImplementation(async (_actor, _uuid, edit) => {
        expect(edit(`Intro\n\n[Stray thought](/note/${C})\n`)).toEqual({ body: "Intro\n" });
        return { success: true, data: { uuid: A, title: "Alpha", category: "Home", tags: [], managed: false } };
      });

      const result = await unlinkItems(alice, A, C);
      expect(result.success).toBe(true);
      expect(result.data?.removed).toBe(1);
    });

    it("says so when the source has no link to the target", async () => {
      mockRewrite.mockImplementation(async (_actor, _uuid, edit) => ({ success: false, error: edit("plain").error }));
      expect(await unlinkItems(alice, A, C)).toEqual({ success: false, error: LINK_MISSING });
    });

    it("refuses sources the caller can't see and targets that aren't uuids", async () => {
      expect((await unlinkItems(alice, BOB, C)).error).toBe(NOT_VISIBLE);
      expect((await unlinkItems(alice, A, "not-a-uuid")).error).toBe(NOT_VISIBLE);
      expect(mockRewrite).not.toHaveBeenCalled();
    });
  });
});
