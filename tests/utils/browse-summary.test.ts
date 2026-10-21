import { describe, it, expect } from "vitest";
import { Checklist, Item, Note } from "@/app/_types";
import { TaskStatus } from "@/app/_types/enums";
import { CARD_EXCERPT_LIMIT } from "@/app/_consts/notes";
import { CHECKLIST_FILTERS, BOARD_FILTERS } from "@/app/_consts/browse";
import { countItems, isItemCompleted } from "@/app/_utils/checklist-count-utils";
import { noteStats } from "@/app/_utils/note-stats-utils";
import {
  noteDisplayOf,
  noteExcerptOf,
  summarizeNote,
  withNoteBody,
} from "@/app/_utils/note-display-utils";
import { summarizeList, TICK_COLUMNS, TICK_ROWS } from "@/app/_utils/browse/list-summary-utils";
import { firstNotesPage, matchesListFilter } from "@/app/_utils/browse-utils";

const note = (content: string, extra: Partial<Note> = {}): Note => ({
  id: "n",
  uuid: "u",
  title: "T",
  content,
  createdAt: "",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

const item = (id: string, extra: Partial<Item> = {}): Item => ({
  id,
  text: `Item ${id}`,
  completed: false,
  order: 0,
  ...extra,
});

const list = (items: Item[], extra: Partial<Checklist> = {}): Checklist => ({
  id: "l",
  uuid: "l",
  title: "L",
  type: "simple",
  items,
  createdAt: "",
  updatedAt: "",
  ...extra,
});

describe("note summaries", () => {
  it("keep the card excerpt and word count of the full body", () => {
    const body = "# Title\n\n**bold** and [a link](https://x.y)\n\n| a | b |\n|---|---|\n| 1 | 2 |";
    const full = note(body);
    const summed = { ...full, content: "", ...summarizeNote(full) };

    expect(noteDisplayOf(summed).stats).toEqual({
      excerpt: noteStats(body).excerpt,
      wordCount: noteStats(body).wordCount,
    });
    expect(noteExcerptOf(summed)).toBe(noteExcerptOf(full));
  });

  it("cap the excerpt as a prefix without splitting a surrogate pair", () => {
    const body = `${"x".repeat(CARD_EXCERPT_LIMIT - 1)}😀 and more`;
    const summary = summarizeNote(note(body));

    expect(noteStats(body).excerpt.startsWith(summary.excerpt)).toBe(true);
    expect(summary.excerpt).toBe("x".repeat(CARD_EXCERPT_LIMIT - 1));
    expect(summary.wordCount).toBe(noteStats(body).wordCount);
  });

  it("say nothing about encrypted notes", () => {
    expect(summarizeNote(note("-----BEGIN PGP MESSAGE-----\nabc", { encrypted: true }))).toEqual({
      excerpt: "",
      wordCount: 0,
    });
  });

  it("drop the summary once the body is merged back", () => {
    const merged = withNoteBody({ ...note(""), excerpt: "e", wordCount: 1 }, "real body");

    expect(merged.content).toBe("real body");
    expect("excerpt" in merged).toBe(false);
    expect("wordCount" in merged).toBe(false);
    expect(noteDisplayOf(merged).hasBody).toBe(true);
  });
});

describe("list summaries", () => {
  const nested = list([
    item("a", { completed: true }),
    item("b", { children: [item("b1", { completed: true }), item("b2"), item("b3", { isArchived: true })] }),
    item("c", { isArchived: true }),
    ...Array.from({ length: 70 }, (_, index) => item(`n${index}`, { completed: index % 2 === 0 })),
  ]);

  const board = list(
    [
      item("t1", { status: TaskStatus.TODO, assignee: "bob", priority: "low" }),
      item("t2", { status: TaskStatus.IN_PROGRESS, priority: "critical", timeEntries: [{ id: "e", startTime: "", duration: 90 }] }),
      item("t3", { status: TaskStatus.IN_PROGRESS, isArchived: true, assignee: "zed" }),
      item("t4", { status: "ghost" }),
    ],
    { type: "kanban" },
  );

  it("count leaves the same way the cards did", () => {
    for (const source of [nested, board]) {
      const summary = summarizeList(source);
      expect({ total: summary.total, completed: summary.completed }).toEqual(
        countItems(source.items, source.type),
      );
    }
  });

  it("bucket ticks into the grid and keep the first open items", () => {
    const summary = summarizeList(nested);

    expect(summary.ticks.cells.length).toBeLessThanOrEqual(TICK_COLUMNS * TICK_ROWS);
    expect(summary.ticks.bucket).toBe(2);
    expect(summary.open.map((entry) => entry.id)).toEqual(["b2", "n1", "n3"]);
  });

  it("describe boards by column, assignee and tracked time", () => {
    const summary = summarizeList(board);

    expect(summary.cards).toBe(3);
    expect(summary.inProgress).toBe(1);
    expect(summary.assignees).toEqual(["bob"]);
    expect(summary.seconds).toBe(90);
    expect(summary.columns[0].top.map((entry) => entry.id)).toEqual(["t1", "t4"]);
    expect(summary.columns.find((column) => column.status.id === TaskStatus.IN_PROGRESS)?.top[0].priority).toBe("critical");
  });

  it("answer every browse filter like the full list", () => {
    const done = list([item("x", { completed: true })]);
    for (const source of [nested, board, done, list([])]) {
      const summed = { ...source, items: [], summary: summarizeList(source) };
      for (const filter of [...CHECKLIST_FILTERS, ...BOARD_FILTERS]) {
        expect(matchesListFilter(summed, filter, false)).toBe(matchesListFilter(source, filter, false));
      }
      expect(summarizeList(source).isFinished).toBe(
        source.items.length > 0 && source.items.every((entry) => isItemCompleted(entry, source.type)),
      );
    }
  });
});

describe("first notes page", () => {
  const notes = Array.from({ length: 30 }, (_, index) =>
    note("", { uuid: `u${index}`, updatedAt: new Date(2026, 0, index + 1).toISOString() }),
  );

  it("matches the newest first default page", () => {
    expect(firstNotesPage(notes, "all", [], 12).map((entry) => entry.uuid)).toEqual(
      Array.from({ length: 12 }, (_, index) => `u${29 - index}`),
    );
  });

  it("honours the pinned default filter", () => {
    expect(firstNotesPage(notes, "pinned", ["Cat/u3", "u7"], 12).map((entry) => entry.uuid)).toEqual([
      "u7",
      "u3",
    ]);
  });
});
