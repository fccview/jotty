import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import nodeFs from "fs";
import os from "os";
import path from "path";
import { mockFs, resetAllMocks } from "../setup";
import { ItemTypes } from "@/app/_types/enums";
import { BrainEdgeKinds, LinkKinds, RelationsStatus } from "@/app/_consts/relations";

vi.unmock("unified");
vi.unmock("unist-util-visit");

const mockBroadcast = vi.fn();

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));

vi.mock("@/app/_server/actions/note/queries", () => ({ getUserNotes: vi.fn() }));
vi.mock("@/app/_server/actions/checklist/queries", () => ({ getUserChecklists: vi.fn() }));

import { readLinks } from "@/app/_server/actions/relations/parser";
import {
  forgetItemFile,
  forgetItemTree,
  indexItemFile,
  rebuildRelations,
  reconcileRelations,
  refreshItemPaths,
  relinksSettled,
  refreshItems,
} from "@/app/_server/actions/relations/indexer";
import { throttledBatch } from "@/app/_server/actions/relations/watcher";
import { backlinksFor, graphFor, VisibleItem } from "@/app/_server/actions/relations/queries";
import {
  closeRelationsDb,
  relationsStatus,
  setRelationsStatus,
} from "@/app/_server/actions/relations/store";
import { stampUuid } from "@/app/_server/actions/lib/stamp-uuid";
import { wrapMention } from "@/app/_server/actions/relations/tidy";
import { pathUuid } from "@/app/_server/actions/lib/read-only";
import { isLockedItem, lockOf } from "@/app/_server/actions/lib/unstamped";
import { StampRefusals } from "@/app/_consts/identity";

const A = "aaaaaaaa-1111-4222-8333-944455556666";
const B = "bbbbbbbb-1111-4222-8333-944455556666";
const C = "cccccccc-1111-4222-8333-944455556666";
const SECRET = "dddddddd-1111-4222-8333-944455556666";

let root: string;

const itemPath = (mode: string, owner: string, rel: string) =>
  path.join(root, "data", mode, owner, rel);

const OLD = "createdAt: 2020-01-01T00:00:00.000Z\n";
const NEW = "createdAt: 2026-01-01T00:00:00.000Z\n";

const note = (uuid: string, title: string, body: string, extra = "") =>
  `---\nuuid: ${uuid}\ntitle: ${title}\n${extra}---\n\n${body}`;

const write = (filePath: string, content: string) => {
  nodeFs.mkdirSync(path.dirname(filePath), { recursive: true });
  nodeFs.writeFileSync(filePath, content);
  indexItemFile(filePath, content, Math.floor(nodeFs.statSync(filePath).mtimeMs));
};

const visibleOf = (items: Array<Partial<VisibleItem> & { uuid: string; title: string }>) =>
  new Map(
    items.map((item) => [
      item.uuid,
      {
        type: ItemTypes.NOTE,
        category: "Uncategorized",
        owner: "alice",
        tags: [],
        ...item,
      } as VisibleItem,
    ]),
  );

const useRealFs = async () => {
  const real = await vi.importActual<typeof import("fs/promises")>("fs/promises");
  mockFs.readFile.mockImplementation(real.readFile as never);
  mockFs.writeFile.mockImplementation(real.writeFile as never);
  mockFs.stat.mockImplementation(real.stat as never);
  mockFs.rename.mockImplementation(real.rename as never);
  mockFs.unlink.mockImplementation(real.unlink as never);
  mockFs.mkdir.mockImplementation(real.mkdir as never);
  mockFs.access.mockImplementation(real.access as never);
};

describe("relations", () => {
  beforeEach(async () => {
    resetAllMocks();
    await useRealFs();
    root = nodeFs.mkdtempSync(path.join(os.tmpdir(), "jotty-relations-"));
    vi.spyOn(process, "cwd").mockReturnValue(root);
    process.env.JOTTY_RELATIONS_DB = path.join(root, "relations.db");
    closeRelationsDb();
    setRelationsStatus(RelationsStatus.READY);
  });

  afterEach(() => {
    closeRelationsDb();
    vi.restoreAllMocks();
    nodeFs.rmSync(root, { recursive: true, force: true });
  });

  describe("readLinks", () => {
    it("reads canonical, legacy and same-origin links and ignores code", () => {
      const parsed = readLinks(
        [
          `[Shop [x]](/note/${A}) [Old](/jotty/${B})`,
          `[Path](/checklist/Work/groceries) https://jotty.example/checklist/${C}`,
          "```",
          `[Code](/note/${SECRET}) [[Hidden]]`,
          "```",
          "`[[inline]]` [[Milk run|errand]] \\[\\[Escaped\\]\\]",
          `[Elsewhere](https://other.example/note/${SECRET})`,
        ].join("\n"),
        ["https://jotty.example"],
      );

      expect(parsed.targets).toEqual([
        { uuid: A, type: ItemTypes.NOTE, kind: LinkKinds.MENTION },
        { uuid: B, type: undefined, kind: LinkKinds.MENTION },
        { type: ItemTypes.CHECKLIST, legacy: { category: "Work", id: "groceries" }, kind: LinkKinds.MENTION },
        { uuid: C, type: ItemTypes.CHECKLIST, kind: LinkKinds.MENTION },
      ]);
      expect(parsed.wikis).toEqual(["Milk run", "Escaped"]);
    });

    it("tells standalone links, mentions and checklist links apart", () => {
      const kinds = (markdown: string) => readLinks(markdown).targets.map((target) => target.kind);

      expect(kinds(`[Alpha](/note/${A})`)).toEqual([LinkKinds.LINK]);
      expect(kinds(`## [Alpha](/note/${A})`)).toEqual([LinkKinds.LINK]);
      expect(kinds(`- [Alpha](/note/${A})`)).toEqual([LinkKinds.LINK]);
      expect(kinds(`**[Alpha](/note/${A})**`)).toEqual([LinkKinds.LINK]);
      expect(kinds(`[alpha]: /note/${A}`)).toEqual([LinkKinds.LINK]);
      expect(kinds(`talk to [Alpha](/note/${A}) first`)).toEqual([LinkKinds.MENTION]);
      expect(kinds(`[Alpha](/note/${A}) [Beta](/note/${B})`)).toEqual([LinkKinds.MENTION, LinkKinds.MENTION]);
      expect(kinds(`- [ ] [Alpha](/note/${A})`)).toEqual([LinkKinds.CHECKLIST]);
      expect(kinds(`- [x] ask [Alpha](/note/${A})`)).toEqual([LinkKinds.CHECKLIST]);
      expect(kinds(`- [ ] task\n  - see [Alpha](/note/${A}) too`)).toEqual([LinkKinds.MENTION]);
    });
  });

  describe("backlinks", () => {
    it("keeps an item's own backlinks when that item is saved again", () => {
      write(itemPath("notes", "alice", "a.md"), note(A, "Alpha", `see [Beta](/note/${B})`));
      write(itemPath("notes", "alice", "b.md"), note(B, "Beta", "first"));
      write(itemPath("notes", "alice", "b.md"), note(B, "Beta", "edited"));

      const visible = visibleOf([{ uuid: A, title: "Alpha" }, { uuid: B, title: "Beta" }]);
      expect(backlinksFor(B, visible).backlinks.map((item) => item.uuid)).toEqual([A]);
    });

    it("gives a checklist its backlinks from a note, even through a /jotty/ link", () => {
      write(itemPath("notes", "alice", "a.md"), note(A, "Alpha", `[List](/jotty/${C})`));
      write(itemPath("checklists", "alice", "list.md"), note(C, "List", "- [ ] milk"));

      const visible = visibleOf([
        { uuid: A, title: "Alpha" },
        { uuid: C, title: "List", type: ItemTypes.CHECKLIST },
      ]);
      expect(backlinksFor(C, visible).backlinks).toMatchObject([
        { uuid: A, kind: LinkKinds.LINK },
      ]);
    });

    it("indexes links inside kanban descriptions and sub-items", () => {
      write(
        itemPath("checklists", "alice", "board.md"),
        note(C, "Board", `- [ ] task | status:todo | description:see [Alpha](/note/${A})`),
      );

      const visible = visibleOf([
        { uuid: A, title: "Alpha" },
        { uuid: C, title: "Board", type: ItemTypes.CHECKLIST },
      ]);
      expect(backlinksFor(A, visible).backlinks.map((item) => item.uuid)).toEqual([C]);
    });

    it("never reads links out of an encrypted note", () => {
      write(
        itemPath("notes", "alice", "secret.md"),
        note(SECRET, "Secret", `[Alpha](/note/${A})`, "encrypted: true\n"),
      );

      const visible = visibleOf([
        { uuid: A, title: "Alpha" },
        { uuid: SECRET, title: "Secret" },
      ]);
      expect(backlinksFor(A, visible).backlinks).toEqual([]);
    });

    it("hides backlinks from items the viewer cannot see", () => {
      write(itemPath("notes", "bob", "private.md"), note(SECRET, "Private", `[Alpha](/note/${A})`));
      write(itemPath("notes", "alice", "a.md"), note(A, "Alpha", "hello"));

      const visible = visibleOf([{ uuid: A, title: "Alpha" }]);
      expect(backlinksFor(A, visible).backlinks).toEqual([]);
    });

    it("survives a rename written before the old file is removed", () => {
      write(itemPath("notes", "alice", "a.md"), note(A, "Alpha", `[Beta](/note/${B})`));
      write(itemPath("notes", "alice", "Work/a-renamed.md"), note(A, "Alpha", `[Beta](/note/${B})`));
      forgetItemFile(itemPath("notes", "alice", "a.md"));

      const visible = visibleOf([{ uuid: A, title: "Alpha" }, { uuid: B, title: "Beta" }]);
      expect(backlinksFor(B, visible).backlinks.map((item) => item.uuid)).toEqual([A]);
    });

    it("drops everything under a deleted folder", () => {
      write(itemPath("notes", "alice", "Work/a.md"), note(A, "Alpha", `[Beta](/note/${B})`));
      forgetItemTree(itemPath("notes", "alice", "Work"));

      const visible = visibleOf([{ uuid: A, title: "Alpha" }, { uuid: B, title: "Beta" }]);
      expect(backlinksFor(B, visible).backlinks).toEqual([]);
    });

    it("counts a [[wikilink]] as a backlink once the title exists", () => {
      write(itemPath("notes", "alice", "a.md"), note(A, "Alpha", "going on a [[milk run]]"));
      write(itemPath("notes", "alice", "b.md"), note(B, "Milk Run", "eggs"));

      const visible = visibleOf([
        { uuid: A, title: "Alpha" },
        { uuid: B, title: "Milk Run" },
      ]);
      expect(backlinksFor(B, visible).backlinks).toMatchObject([
        { uuid: A, kind: LinkKinds.WIKI },
      ]);
    });
  });

  describe("graphFor", () => {
    it("draws ghosts for unresolved wikilinks and hubs for tags", () => {
      write(itemPath("notes", "alice", "a.md"), note(A, "Alpha", `[[Someday]] [Beta](/note/${B})`));

      const graph = graphFor(
        "alice",
        visibleOf([
          { uuid: A, title: "Alpha", tags: ["home"] },
          { uuid: B, title: "Beta", tags: ["home"] },
        ]),
      );

      expect(graph.nodes.map((node) => node.id).sort()).toEqual(
        [A, B, "ghost:someday", "tag:home"].sort(),
      );
      expect(graph.edges).toHaveLength(4);
      expect(graph.nodes.find((node) => node.id === "ghost:someday")?.title).toBe("Someday");
    });

    it("draws an edge per kind of link", () => {
      write(
        itemPath("notes", "alice", "a.md"),
        note(A, "Alpha", `[Beta](/note/${B})\n\nask [Beta](/note/${B}) and [Gamma](/note/${C})\n\n- [ ] [Gamma](/note/${C})`),
      );

      const graph = graphFor(
        "alice",
        visibleOf([
          { uuid: A, title: "Alpha" },
          { uuid: B, title: "Beta" },
          { uuid: C, title: "Gamma" },
        ]),
      );

      const edges = graph.edges
        .filter((edge) => edge.kind !== BrainEdgeKinds.SUGGESTED)
        .map((edge) => `${edge.target}:${edge.kind}`)
        .sort();
      expect(edges).toEqual(
        [
          `${B}:${BrainEdgeKinds.LINK}`,
          `${B}:${BrainEdgeKinds.MENTION}`,
          `${C}:${BrainEdgeKinds.MENTION}`,
          `${C}:${BrainEdgeKinds.CHECKLIST}`,
        ].sort(),
      );
      expect(backlinksFor(B, visibleOf([{ uuid: A, title: "Alpha" }, { uuid: B, title: "Beta" }])).backlinks).toMatchObject([
        { uuid: A, kind: LinkKinds.MENTION },
      ]);
    });

    it("leaves out links whose source the viewer cannot see", () => {
      write(itemPath("notes", "bob", "private.md"), note(SECRET, "Private", `[Alpha](/note/${A})`));

      const graph = graphFor("alice", visibleOf([{ uuid: A, title: "Alpha" }]));
      expect(graph.edges).toEqual([]);
      expect(graph.nodes.map((node) => node.id)).toEqual([A]);
    });
  });

  describe("wikilink resolution", () => {
    const aPath = () => itemPath("notes", "alice", "a.md");
    const bPath = () => itemPath("notes", "alice", "b.md");
    const cPath = () => itemPath("notes", "alice", "c.md");
    const all = () =>
      visibleOf([
        { uuid: A, title: "Alpha" },
        { uuid: B, title: "Plan" },
        { uuid: C, title: "Plan" },
      ]);

    it("settles an ambiguous title on the item whose path sorts first", () => {
      write(cPath(), note(C, "Plan", "new", OLD));
      write(bPath(), note(B, "Plan", "old", NEW));
      write(aPath(), note(A, "Alpha", "see [[Plan]]"));

      expect(backlinksFor(A, all()).wikis).toEqual({ plan: B });
    });

    it("hands a link to a same-titled item whose path sorts first, as a rebuild would", async () => {
      write(cPath(), note(C, "Plan", "c"));
      write(aPath(), note(A, "Alpha", "see [[Plan]]"));
      expect(backlinksFor(A, all()).wikis).toEqual({ plan: C });

      write(bPath(), note(B, "Plan", "b"));
      expect(backlinksFor(A, all()).wikis).toEqual({ plan: B });

      await rebuildRelations();
      expect(backlinksFor(A, all()).wikis).toEqual({ plan: B });
    });

    it("moves to the next match when the target is deleted", () => {
      write(bPath(), note(B, "Plan", "b"));
      write(cPath(), note(C, "Plan", "c"));
      write(aPath(), note(A, "Alpha", "see [[Plan]]"));

      forgetItemFile(bPath());
      expect(backlinksFor(A, all()).wikis).toEqual({ plan: C });
    });

    it("binds a ghost once a note with that title shows up", () => {
      write(aPath(), note(A, "Alpha", "one day [[Plan]]"));
      expect(graphFor("alice", all()).nodes.some((node) => node.id === "ghost:plan")).toBe(true);

      write(bPath(), note(B, "Plan", "now it exists"));
      expect(backlinksFor(B, all()).backlinks.map((item) => item.uuid)).toEqual([A]);
      expect(graphFor("alice", all()).nodes.some((node) => node.id === "ghost:plan")).toBe(false);
    });

    it("retargets a link when its text is edited", () => {
      write(bPath(), note(B, "Plan", "b"));
      write(cPath(), note(C, "Trip", "c"));
      write(aPath(), note(A, "Alpha", "see [[Plan]]"));
      write(aPath(), note(A, "Alpha", "see [[Trip]]"));

      const visible = visibleOf([
        { uuid: A, title: "Alpha" },
        { uuid: B, title: "Plan" },
        { uuid: C, title: "Trip" },
      ]);
      expect(backlinksFor(B, visible).backlinks).toEqual([]);
      expect(backlinksFor(C, visible).backlinks.map((item) => item.uuid)).toEqual([A]);
    });

    it("finds Obsidian targets by filename, path, extension and alias, and skips embeds", async () => {
      const bare = (uuid: string, body: string, extra = "") => `---\nuuid: ${uuid}\n${extra}---\n\n${body}`;
      write(itemPath("notes", "alice", "Projects/My Note.md"), bare(B, "# A different heading\nbody"));
      write(itemPath("notes", "alice", "Archive/my-list.md"), bare(C, "body", "aliases:\n  - Shopping\n"));
      write(
        aPath(),
        note(
          A,
          "Alpha",
          "[[My Note]] [[projects/my note]] [[My Note.md]] [[my-list]] [[shopping|food]] ![[img.png]]",
        ),
      );

      const wikis = backlinksFor(A, all()).wikis;
      expect(wikis).toEqual({
        "my note": B,
        "projects/my note": B,
        "my note.md": B,
        "my-list": C,
        shopping: C,
      });

      await rebuildRelations();
      expect(backlinksFor(A, all()).wikis).toEqual(wikis);
    });

    it("prefers a title over a filename", () => {
      write(itemPath("notes", "alice", "plan.md"), note(B, "Budget", "b"));
      write(cPath(), note(C, "Plan", "c"));
      write(aPath(), note(A, "Alpha", "see [[plan]]"));

      expect(backlinksFor(A, all()).wikis).toEqual({ plan: C });
    });
  });

  describe("renaming a wikilink target", () => {
    const aPath = () => itemPath("notes", "alice", "a.md");
    const bPath = () => itemPath("notes", "alice", "b.md");
    const twoNotes = () => visibleOf([{ uuid: A, title: "Alpha" }, { uuid: B, title: "Q3 plan" }]);

    it("rewrites the notes that link to it, keeping headings, aliases and code", async () => {
      write(bPath(), note(B, "Plan", "b"));
      write(aPath(), note(A, "Alpha", "see [[Plan]], [[plan#Budget|the money]] and `[[Plan]]` in code"));
      write(bPath(), note(B, "Q3 plan", "b"));
      await relinksSettled();

      expect(nodeFs.readFileSync(aPath(), "utf-8")).toContain(
        "see [[Q3 plan]], [[Q3 plan#Budget|the money]] and `[[Plan]]` in code",
      );
      expect(backlinksFor(B, twoNotes()).backlinks.map((item) => item.uuid)).toEqual([A]);
      expect(backlinksFor(A, twoNotes()).wikis).toEqual({ "q3 plan": B });
      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({ type: "note", action: "updated", entityId: A }),
      );
    });

    it("rewrites checklist items and their descriptions", async () => {
      const listPath = itemPath("checklists", "alice", "list.md");
      write(bPath(), note(B, "Plan", "b"));
      write(
        listPath,
        `---\nuuid: ${C}\ntitle: List\n---\n- [ ] call about [[Plan]] | description:see [[Plan∣the plan]]\n- [x] unrelated | time:0`,
      );
      write(bPath(), note(B, "Q3 plan", "b"));
      await relinksSettled();

      const saved = nodeFs.readFileSync(listPath, "utf-8");
      expect(saved).toContain("- [ ] call about [[Q3 plan]] | description:see [[Q3 plan∣the plan]]");
      expect(saved).toContain("- [x] unrelated | time:0");
    });

    it("writes a filename when the new title already belongs to an earlier item", async () => {
      write(bPath(), note(B, "Plan", "b"));
      write(itemPath("notes", "alice", "a-first.md"), note(C, "Q3 plan", "c"));
      write(aPath(), note(A, "Alpha", "see [[Plan]]"));
      write(bPath(), note(B, "Q3 plan", "b"));
      await relinksSettled();

      expect(nodeFs.readFileSync(aPath(), "utf-8")).toContain("see [[b]]");
      expect(backlinksFor(A, all3()).wikis).toEqual({ b: B });
    });

    it("follows a rename written before the old file is removed", async () => {
      const oldPath = itemPath("notes", "alice", "plan.md");
      write(oldPath, note(B, "Plan", "b"));
      write(aPath(), note(A, "Alpha", "see [[Plan]]"));
      write(itemPath("notes", "alice", "q3-plan.md"), note(B, "Q3 plan", "b"));
      nodeFs.rmSync(oldPath);
      forgetItemFile(oldPath);
      await relinksSettled();

      expect(nodeFs.readFileSync(aPath(), "utf-8")).toContain("see [[Q3 plan]]");
    });

    it("leaves files alone when only rebuilding", async () => {
      const body = note(A, "Alpha", "see [[Plan]]");
      nodeFs.mkdirSync(path.dirname(aPath()), { recursive: true });
      nodeFs.writeFileSync(aPath(), body);
      nodeFs.writeFileSync(bPath(), note(B, "Q3 plan", "b"));

      await rebuildRelations();
      await relinksSettled();
      expect(nodeFs.readFileSync(aPath(), "utf-8")).toBe(body);
    });

    const all3 = () =>
      visibleOf([
        { uuid: A, title: "Alpha" },
        { uuid: B, title: "Q3 plan" },
        { uuid: C, title: "Q3 plan" },
      ]);
  });
  describe("unlinked mentions", () => {
    it("lists notes that name the item in plain text but do not link it", () => {
      write(itemPath("notes", "alice", "b.md"), note(B, "Milk Run", "target"));
      write(itemPath("notes", "alice", "a.md"), note(A, "Alpha", "Tomorrow is the milk  run, again."));
      write(itemPath("notes", "alice", "c.md"), note(C, "Gamma", `already linked [Milk Run](/note/${B})`));
      write(itemPath("notes", "alice", "s.md"), note(SECRET, "Skimmed", "a milkrun is not it"));

      const visible = visibleOf([
        { uuid: A, title: "Alpha" },
        { uuid: B, title: "Milk Run" },
        { uuid: C, title: "Gamma" },
        { uuid: SECRET, title: "Skimmed" },
      ]);
      const { mentions } = backlinksFor(B, visible);
      expect(mentions.map((item) => item.uuid)).toEqual([A]);
      expect(mentions[0].snippet).toContain("the milk run, again");
    });

    it("never reads encrypted notes", () => {
      write(itemPath("notes", "alice", "b.md"), note(B, "Milk Run", "target"));
      write(
        itemPath("notes", "alice", "s.md"),
        note(SECRET, "Secret", "milk run", "encrypted: true\n"),
      );
      const visible = visibleOf([
        { uuid: B, title: "Milk Run" },
        { uuid: SECRET, title: "Secret" },
      ]);
      expect(backlinksFor(B, visible).mentions).toEqual([]);
    });

    it("wraps the first plain mention, skipping code, links and wikilinks", () => {
      const body = "`Milk Run` and [[Milk Run]] and [Milk Run](/x) then the milk run itself";
      expect(wrapMention(body, "Milk Run", `/note/${B}`)).toBe(
        `\`Milk Run\` and [[Milk Run]] and [Milk Run](/x) then the [milk run](/note/${B}) itself`,
      );
      expect(wrapMention("nothing here", "Milk Run", `/note/${B}`)).toBeNull();
    });
  });

  describe("watching", () => {
    it("indexes the first change after a settle and batches the rest into one pass a minute", async () => {
      vi.useFakeTimers();
      try {
        const flush = vi.fn().mockResolvedValue(0);
        const batch = throttledBatch(flush, 60_000, 1_000);

        batch.add("/a.md");
        await vi.advanceTimersByTimeAsync(1_000);
        expect(flush).toHaveBeenCalledTimes(1);
        expect(flush).toHaveBeenLastCalledWith(["/a.md"]);

        for (let edit = 0; edit < 10; edit++) {
          batch.add("/a.md");
          batch.add(`/b${edit % 2}.md`);
          await vi.advanceTimersByTimeAsync(3_000);
        }
        expect(flush).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(60_000);
        expect(flush).toHaveBeenCalledTimes(2);
        expect([...flush.mock.calls[1][0]].sort()).toEqual(["/a.md", "/b0.md", "/b1.md"]);
        batch.stop();
      } finally {
        vi.useRealTimers();
      }
    });

    it("lets a read flush pending changes without waiting out the minute", async () => {
      vi.useFakeTimers();
      try {
        const flush = vi.fn().mockResolvedValue(0);
        const batch = throttledBatch(flush, 60_000, 1_000);

        batch.add("/a.md");
        await vi.advanceTimersByTimeAsync(1_000);
        batch.add("/b.md");
        await batch.flush();

        expect(flush).toHaveBeenCalledTimes(2);
        expect(flush).toHaveBeenLastCalledWith(["/b.md"]);
        await vi.advanceTimersByTimeAsync(120_000);
        expect(flush).toHaveBeenCalledTimes(2);

        await batch.flush();
        expect(flush).toHaveBeenCalledTimes(2);
        batch.stop();
      } finally {
        vi.useRealTimers();
      }
    });

    it("refreshes a named item that changed on disk behind the index", async () => {
      const aPath = itemPath("notes", "alice", "a.md");
      write(aPath, note(A, "Alpha", `[Beta](/note/${B})`));
      nodeFs.writeFileSync(aPath, note(A, "Alpha", "edited by a script"));
      nodeFs.utimesSync(aPath, new Date(), new Date(Date.now() + 5_000));

      const visible = visibleOf([{ uuid: A, title: "Alpha" }, { uuid: B, title: "Beta" }]);
      expect(backlinksFor(B, visible).backlinks).toHaveLength(1);

      expect(await refreshItems([A.toUpperCase()])).toBe(1);
      expect(backlinksFor(B, visible).backlinks).toEqual([]);
    });

    it("re-reads only paths whose file actually changed", async () => {
      const aPath = itemPath("notes", "alice", "a.md");
      write(aPath, note(A, "Alpha", `[Beta](/note/${B})`));
      mockBroadcast.mockClear();

      expect(await refreshItemPaths([aPath])).toBe(0);
      expect(mockBroadcast).not.toHaveBeenCalled();

      nodeFs.writeFileSync(aPath, note(A, "Alpha", "no links now"));
      nodeFs.utimesSync(aPath, new Date(), new Date(Date.now() + 5_000));
      expect(await refreshItemPaths([aPath])).toBe(1);

      const visible = visibleOf([{ uuid: A, title: "Alpha" }, { uuid: B, title: "Beta" }]);
      expect(backlinksFor(B, visible).backlinks).toEqual([]);

      nodeFs.rmSync(aPath);
      expect(await refreshItemPaths([aPath])).toBe(1);
      expect(mockBroadcast).toHaveBeenCalledWith(expect.objectContaining({ type: "relations" }));
    });

    it("drops a watcher pass whose file was saved again while it was reading", async () => {
      const aPath = itemPath("notes", "alice", "a.md");
      write(aPath, note(A, "Alpha", "no links yet"));
      const stale = note(A, "Alpha", "no links yet");
      nodeFs.utimesSync(aPath, new Date(), new Date(Date.now() + 5_000));

      const real = await vi.importActual<typeof import("fs/promises")>("fs/promises");
      mockFs.readFile.mockImplementationOnce(async () => {
        const fresh = note(A, "Alpha", `now [Beta](/note/${B})`);
        nodeFs.writeFileSync(aPath, fresh);
        nodeFs.utimesSync(aPath, new Date(), new Date(Date.now() + 10_000));
        indexItemFile(aPath, fresh, Math.floor(nodeFs.statSync(aPath).mtimeMs));
        return stale;
      });
      mockFs.readFile.mockImplementation(real.readFile as never);

      await refreshItemPaths([aPath]);
      const visible = visibleOf([{ uuid: A, title: "Alpha" }, { uuid: B, title: "Beta" }]);
      expect(backlinksFor(B, visible).backlinks.map((item) => item.uuid)).toEqual([A]);
    });

    it("picks up a category folder moved outside Jotty", async () => {
      const from = itemPath("notes", "alice", "Old");
      const to = itemPath("notes", "alice", "New");
      write(path.join(from, "a.md"), note(A, "Alpha", `[Beta](/note/${B})`));
      nodeFs.renameSync(from, to);

      await refreshItemPaths([from, to]);
      const visible = visibleOf([{ uuid: A, title: "Alpha" }, { uuid: B, title: "Beta" }]);
      expect(backlinksFor(B, visible).backlinks.map((item) => item.uuid)).toEqual([A]);
    });
  });

  describe("reconcileRelations", () => {
    it("builds from scratch, then forgets files that disappeared", async () => {
      const aPath = itemPath("notes", "alice", "a.md");
      nodeFs.mkdirSync(path.dirname(aPath), { recursive: true });
      nodeFs.writeFileSync(aPath, note(A, "Alpha", `[Beta](/note/${B})`));
      nodeFs.writeFileSync(itemPath("notes", "alice", "b.md"), note(B, "Beta", "hi"));

      setRelationsStatus(RelationsStatus.BUILDING);
      await reconcileRelations();
      expect(relationsStatus()).toBe(RelationsStatus.READY);
      expect(mockBroadcast).toHaveBeenCalledWith(expect.objectContaining({ type: "relations" }));

      const visible = visibleOf([{ uuid: A, title: "Alpha" }, { uuid: B, title: "Beta" }]);
      expect(backlinksFor(B, visible).backlinks.map((item) => item.uuid)).toEqual([A]);

      nodeFs.rmSync(aPath);
      await reconcileRelations();
      expect(backlinksFor(B, visible).backlinks).toEqual([]);
    });
  });

  describe("stampUuid", () => {
    const untouched = async (name: string, content: string) => {
      const filePath = itemPath("notes", "alice", name);
      nodeFs.mkdirSync(path.dirname(filePath), { recursive: true });
      nodeFs.writeFileSync(filePath, content);

      await expect(stampUuid(filePath)).resolves.toBe(pathUuid(filePath));
      expect(nodeFs.readFileSync(filePath, "utf-8")).toBe(content);
    };

    it("gives an empty read an id from its path instead of writing a stub", () =>
      untouched("empty.md", ""));

    it("gives frontmatter it could not parse an id from its path", () =>
      untouched("broken.md", "---\ntitle: [unclosed\nfoo: bar\n---\n\nprecious body"));

    it("leaves Obsidian frontmatter js-yaml rejects alone", async () => {
      await untouched("colon.md", "---\ntitle: Meeting: weekly sync\n---\n\nbody");
      await untouched("tabs.md", "---\ntags:\n\t- a\n\t- b\n---\n\nbody");
    });

    it("never overwrites a uuid field that is not a uuid", () =>
      untouched("zettel.md", "---\nuuid: 202305121200\ntags: [x]\n---\n\nbody"));

    it("locks an item it could not stamp until it has a real uuid", async () => {
      const filePath = itemPath("notes", "alice", "locked.md");
      nodeFs.mkdirSync(path.dirname(filePath), { recursive: true });
      nodeFs.writeFileSync(filePath, "---\ntitle: Meeting: weekly sync\n---\n\nbody");

      await expect(lockOf(filePath)).resolves.toBe(StampRefusals.UNPARSABLE);
      await expect(isLockedItem(pathUuid(filePath), filePath)).resolves.toBe(true);

      nodeFs.writeFileSync(filePath, `---\nuuid: ${pathUuid(filePath)}\ntitle: "Meeting: weekly sync"\n---\n\nbody`);
      await expect(isLockedItem(pathUuid(filePath), filePath)).resolves.toBe(false);
    });

    it("fills an empty uuid field instead of adding a second one", async () => {
      const filePath = itemPath("notes", "alice", "blank.md");
      nodeFs.mkdirSync(path.dirname(filePath), { recursive: true });
      nodeFs.writeFileSync(filePath, "---\nuuid:\naliases: []\n---\n\nbody");

      const uuid = await stampUuid(filePath);
      const written = nodeFs.readFileSync(filePath, "utf-8");

      expect(uuid).not.toBe(pathUuid(filePath));
      expect(written.match(/^uuid:/gm)).toHaveLength(1);
      expect(written).toContain(`uuid: ${uuid}\naliases: []\n`);
    });

    it("stamps a uuid without touching the rest of the file", async () => {
      const filePath = itemPath("notes", "alice", "plain.md");
      nodeFs.mkdirSync(path.dirname(filePath), { recursive: true });
      nodeFs.writeFileSync(filePath, "---\ntitle: Plain\n---\n\nbody stays");

      const uuid = await stampUuid(filePath);
      const written = nodeFs.readFileSync(filePath, "utf-8");

      expect(uuid).toMatch(/^[0-9a-f-]{36}$/);
      expect(written).toContain(`uuid: ${uuid}\n`);
      expect(written).toContain("title: Plain\n");
      expect(written).toContain("createdAt:");
      expect(written.endsWith("body stays")).toBe(true);
    });
  });
});
