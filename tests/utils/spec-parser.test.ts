import { describe, it, expect } from "vitest";
import { SpecSections } from "@/app/_consts/agents";
import { mentions, specEntries, specSections } from "@/app/_utils/spec/sections";
import { specAgents, specTasks, taskFor } from "@/app/_utils/spec/roster";
import { snipper } from "@/app/_utils/spec/bounds";

const SPEC = [
  "# Spec: Parser rewrite",
  "",
  "## Goal",
  "Ship the new parser.",
  "",
  "## ACCEPTANCE CRITERIA",
  "- Old files still open",
  "",
  "## Agents",
  "- `parser-bot` - owns the tokenizer",
  "- `UI-Bot`: renders the preview",
  "* **docs.bot** writes the how-to",
  "- `parser-bot` - duplicate line",
  "- (tbd) somebody later",
  "  - `nested-bot` - indented, ignored",
  "",
  "## Tasks",
  "- `card-1` - tokenizer - agent `parser-bot`",
  "- `card-2` - preview - depends on `card-1`, `card-3` - agent `ui-bot`",
  "- `card-3` - agent `docs.bot` - depends on `card-1`",
  "- no card id here",
  "",
  "```",
  "## Progress",
  "not a heading, it is inside a fence",
  "```",
  "",
  "## Progress",
  "- card-1: tokenizer half done",
  "  still missing escapes",
  "- ui-bot started the preview",
  "",
  "A paragraph about robot arms.",
  "",
  "## Handover",
  "- `card-2` / `ui-bot` - next: wire the toolbar",
  "",
  "# Appendix",
  "## Blockers",
  "- this one is outside the spec, after an H1, but still an H2 named Blockers",
].join("\n");

describe("spec note parser", () => {
  const sections = specSections(SPEC);

  it("splits H2 sections case-insensitively and ignores fenced headings", () => {
    expect(sections[SpecSections.GOAL]).toBe("Ship the new parser.");
    expect(sections[SpecSections.ACCEPTANCE]).toBe("- Old files still open");
    expect(sections[SpecSections.TASKS]).toContain("## Progress\nnot a heading");
    expect(sections[SpecSections.PROGRESS]?.startsWith("- card-1")).toBe(true);
    expect(sections[SpecSections.DECISIONS]).toBeUndefined();
  });

  it("stops a section at the next H1", () => {
    expect(sections[SpecSections.HANDOVER]).toBe("- `card-2` / `ui-bot` - next: wire the toolbar");
  });

  it("indexes top-level agents, lowercased, first wins", () => {
    expect(specAgents(sections[SpecSections.AGENTS])).toEqual([
      { id: "parser-bot", role: "owns the tokenizer" },
      { id: "ui-bot", role: "renders the preview" },
      { id: "docs.bot", role: "writes the how-to" },
    ]);
  });

  it("reads task lines with their agent and dependencies", () => {
    const tasks = specTasks(sections[SpecSections.TASKS]);

    expect(tasks.map((task) => task.cardId)).toEqual(["card-1", "card-2", "card-3"]);
    expect(taskFor(tasks, "card-2")).toMatchObject({ agent: "ui-bot", dependsOn: ["card-1", "card-3"] });
    expect(taskFor(tasks, "card-3")).toMatchObject({ agent: "docs.bot", dependsOn: ["card-1"] });
    expect(taskFor(tasks, "card-1")).toMatchObject({ agent: "parser-bot", dependsOn: [] });
    expect(taskFor(tasks, "card-9")).toBeUndefined();
  });

  it("groups list items with their continuation lines, and paragraphs", () => {
    expect(specEntries(sections[SpecSections.PROGRESS])).toEqual([
      "- card-1: tokenizer half done\n  still missing escapes",
      "- ui-bot started the preview",
      "A paragraph about robot arms.",
    ]);
  });

  it("matches card and agent ids as whole tokens", () => {
    expect(mentions("- card-1: done", "card-1")).toBe(true);
    expect(mentions("- card-10: done", "card-1")).toBe(false);
    expect(mentions("A paragraph about robot arms.", "bot")).toBe(false);
    expect(mentions("handed to `UI-BOT`.", "ui-bot")).toBe(true);
    expect(mentions("anything", "")).toBe(false);
  });

  it("cuts long text and lists and remembers that it did", () => {
    const snip = snipper();

    expect(snip.text("short", 10)).toBe("short");
    expect(snip.wasCut()).toBe(false);
    expect(snip.tail([1, 2, 3, 4], 2)).toEqual([3, 4]);
    expect(snip.wasCut()).toBe(true);

    const other = snipper();
    expect(other.rows([1, 2, 3], 2)).toEqual([1, 2]);
    expect(other.text("abcdef", 3)).toBe("abc");
    expect(other.text(undefined, 3)).toBeUndefined();
  });
});
