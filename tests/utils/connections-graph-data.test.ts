import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ItemTypes } from "@/app/_types/enums";
import { LinkIndex } from "@/app/_types";
import {
  buildConnectionGraphData,
  filterArchivedLinkIndex,
  filterConnectionGraphData,
} from "@/app/_components/FeatureComponents/Profile/Parts/ConnectionsGraph/graph-data";

const noteA = "11111111-1111-4111-8111-111111111111";
const noteB = "22222222-2222-4222-8222-222222222222";
const noteC = "33333333-3333-4333-8333-333333333333";
const listA = "44444444-4444-4444-8444-444444444444";
const listB = "55555555-5555-4555-8555-555555555555";

const emptyLinks = () => ({
  isLinkedTo: { notes: [], checklists: [] },
  isReferencedIn: { notes: [], checklists: [] },
});

const baseIndex = (): LinkIndex => ({
  notes: {},
  checklists: {},
});

const notes = [
  {
    uuid: noteA,
    id: "alpha",
    title: "Alpha",
    category: "Work",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
    tags: ["project"],
  },
  {
    uuid: noteB,
    id: "beta",
    title: "Beta",
    category: "Work",
    createdAt: "2024-01-03T00:00:00.000Z",
    updatedAt: "2024-01-04T00:00:00.000Z",
    tags: ["reference"],
  },
  {
    uuid: noteC,
    id: "orphan",
    title: "Orphan",
    category: "Personal",
    createdAt: "2024-01-05T00:00:00.000Z",
    updatedAt: "2024-01-06T00:00:00.000Z",
  },
];

const checklists = [
  {
    uuid: listA,
    id: "tasks",
    title: "Tasks",
    type: "simple" as const,
    category: "Work",
    items: [],
    createdAt: "2024-01-07T00:00:00.000Z",
    updatedAt: "2024-01-08T00:00:00.000Z",
  },
  {
    uuid: listB,
    id: "archive",
    title: "Archive",
    type: "task" as const,
    category: "Old",
    items: [],
    createdAt: "2024-01-09T00:00:00.000Z",
    updatedAt: "2024-01-10T00:00:00.000Z",
  },
];

describe("connections graph data", () => {
  it("builds note-to-note explicit links", () => {
    const index = baseIndex();
    index.notes[noteA] = {
      ...emptyLinks(),
      isLinkedTo: { notes: [noteB], checklists: [] },
    };

    const graph = buildConnectionGraphData(index, notes, checklists);

    expect(graph.nodes.map((node) => node.id).sort()).toEqual([noteA, noteB]);
    expect(graph.links).toEqual([{ source: noteA, target: noteB, directed: true, type: "explicit" }]);
    expect(graph.nodes.find((node) => node.id === noteA)?.outboundCount).toBe(1);
    expect(graph.nodes.find((node) => node.id === noteB)?.inboundCount).toBe(1);
  });

  it("builds note-to-checklist and checklist-to-note links", () => {
    const index = baseIndex();
    index.notes[noteA] = {
      ...emptyLinks(),
      isLinkedTo: { notes: [], checklists: [listA] },
    };
    index.checklists[listA] = {
      ...emptyLinks(),
      isLinkedTo: { notes: [noteB], checklists: [] },
    };

    const graph = buildConnectionGraphData(index, notes, checklists);

    expect(graph.links).toHaveLength(2);
    expect(graph.links).toContainEqual({ source: noteA, target: listA, directed: true, type: "explicit" });
    expect(graph.links).toContainEqual({ source: listA, target: noteB, directed: true, type: "explicit" });
    expect(graph.nodes.find((node) => node.id === listA)?.type).toBe(ItemTypes.CHECKLIST);
  });

  it("connects items that share tags", () => {
    const index = baseIndex();
    const taggedNotes = [
      { ...notes[0], tags: ["project", "shared"] },
      { ...notes[1], tags: ["shared"] },
      { ...notes[2], tags: ["other"] },
    ];

    const graph = buildConnectionGraphData(index, taggedNotes, checklists);

    expect(graph.links).toContainEqual({
      source: noteA,
      target: noteB,
      directed: false,
      type: "tag",
      tag: "shared",
    });
    expect(graph.links).not.toContainEqual(
      expect.objectContaining({ source: noteA, target: noteC, type: "tag" }),
    );
    expect(graph.nodes.find((node) => node.id === noteA)?.connectionCount).toBe(1);
    expect(graph.nodes.find((node) => node.id === noteB)?.connectionCount).toBe(1);
  });

  it("de-dupes duplicate bidirectional visible edges", () => {
    const index = baseIndex();
    index.notes[noteA] = {
      ...emptyLinks(),
      isLinkedTo: { notes: [noteB], checklists: [] },
    };
    index.notes[noteB] = {
      ...emptyLinks(),
      isLinkedTo: { notes: [noteA], checklists: [] },
    };

    const graph = buildConnectionGraphData(index, notes, checklists);

    expect(graph.links).toHaveLength(1);
    expect(graph.links[0]).toMatchObject({ source: noteA, target: noteB, type: "explicit" });
    expect(graph.nodes.find((node) => node.id === noteA)?.connectionCount).toBe(2);
    expect(graph.nodes.find((node) => node.id === noteB)?.connectionCount).toBe(2);
  });

  it("filters archived items by UUID first and legacy key fallback", () => {
    const index = baseIndex();
    index.notes[noteA] = {
      ...emptyLinks(),
      isLinkedTo: { notes: [noteB], checklists: ["Old/archive"] },
    };
    index.notes[noteB] = emptyLinks();
    index.checklists["Old/archive"] = emptyLinks();

    const filtered = filterArchivedLinkIndex(index, [
      { uuid: noteB, id: "wrong", title: "Wrong", content: "", createdAt: "", updatedAt: "" },
      { id: "archive", title: "Archive", type: "task", category: "Old", items: [], createdAt: "", updatedAt: "" },
    ]);

    expect(filtered.notes[noteB]).toBeUndefined();
    expect(filtered.checklists["Old/archive"]).toBeUndefined();
    expect(filtered.notes[noteA].isLinkedTo.notes).toEqual([]);
    expect(filtered.notes[noteA].isLinkedTo.checklists).toEqual([]);
  });

  it("filters missing targets", () => {
    const index = baseIndex();
    index.notes[noteA] = {
      ...emptyLinks(),
      isLinkedTo: {
        notes: ["66666666-6666-4666-8666-666666666666"],
        checklists: [],
      },
    };

    const graph = buildConnectionGraphData(index, notes, checklists);

    expect(graph.nodes).toEqual([]);
    expect(graph.links).toEqual([]);
  });

  it("includes or excludes orphan nodes", () => {
    const index = baseIndex();

    expect(buildConnectionGraphData(index, notes, checklists).nodes).toEqual([]);

    const graph = buildConnectionGraphData(index, notes, checklists, true);

    expect(graph.nodes.map((node) => node.id)).toContain(noteC);
    expect(graph.nodes.find((node) => node.id === noteC)?.orphan).toBe(true);
  });

  it("filters visible graph data by search and type", () => {
    const index = baseIndex();
    index.notes[noteA] = {
      ...emptyLinks(),
      isLinkedTo: { notes: [], checklists: [listA] },
    };

    const graph = buildConnectionGraphData(index, notes, checklists, true);
    const filtered = filterConnectionGraphData(graph, {
      search: "tasks",
      showNotes: true,
      showChecklists: true,
      showOrphans: false,
      showTagLinks: true,
    });

    expect(filtered.nodes.map((node) => node.id)).toEqual([listA]);
    expect(filtered.links).toEqual([]);
  });

  it("can hide tag links from the visible graph", () => {
    const index = baseIndex();
    const taggedNotes = [
      { ...notes[0], tags: ["shared"] },
      { ...notes[1], tags: ["shared"] },
    ];
    const graph = buildConnectionGraphData(index, taggedNotes, checklists);
    const filtered = filterConnectionGraphData(graph, {
      search: "",
      showNotes: true,
      showChecklists: true,
      showOrphans: false,
      showTagLinks: false,
    });

    expect(graph.links.some((link) => link.type === "tag")).toBe(true);
    expect(filtered.links).toEqual([]);
    expect(filtered.nodes).toEqual([]);
  });

  it("puts the graph before the controls on mobile while keeping desktop controls first", () => {
    const source = readFileSync(
      "app/_components/FeatureComponents/Profile/Parts/LinksTab.tsx",
      "utf8",
    );

    expect(source).toContain("order-2 lg:order-1");
    expect(source).toContain("order-1 lg:order-2");
    expect(source.indexOf("order-2 lg:order-1")).toBeLessThan(
      source.indexOf("order-1 lg:order-2"),
    );
  });

  it("uses existing profile translation keys for graph labels", () => {
    const source = readFileSync(
      "app/_components/FeatureComponents/Profile/Parts/LinksTab.tsx",
      "utf8",
    );

    expect(source).not.toContain('t("common.unknown")');
    expect(source).toContain('t("profile.unknown")');
  });

  it("paints a larger node pointer area for mobile tapping", () => {
    const source = readFileSync(
      "app/_components/FeatureComponents/Profile/Parts/ConnectionsGraph/ConnectionsGraph.tsx",
      "utf8",
    );

    expect(source).toContain("MIN_POINTER_RADIUS");
    expect(source).toContain("nodePointerAreaPaint");
    expect(source).toContain("globalScale");
    expect(source).toContain("MIN_POINTER_RADIUS / globalScale");
    expect(source).toContain("enableNodeDrag={!isCoarsePointer}");
  });
});
