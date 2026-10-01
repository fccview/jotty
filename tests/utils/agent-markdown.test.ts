import { describe, it, expect, vi } from "vitest";
import { listToMarkdown, parseMarkdown } from "@/app/_utils/checklist-utils";
import { parseChecklistContent, parseNoteContent } from "@/app/_utils/client-parser-utils";
import { ChecklistsTypes } from "@/app/_types/enums";
import { Checklist } from "@/app/_types";

vi.unmock("@/app/_utils/checklist-utils");

const SPEC = "5b1e8a52-3c1d-4d7e-9f0a-1b2c3d4e5f60";
const BOARD = "0f6a3b2c-8d9e-4f10-a1b2-c3d4e5f60718";

const AGENT_BOARD = [
  "---",
  `uuid: ${BOARD}`,
  "title: Agent Board",
  "checklistType: kanban",
  `specNote: ${SPEC}`,
  "---",
  '- [ ] Build parser | status:in_progress | time:0 | assignee:alice | agent:parser-bot | metadata:{"id":"card-1"}',
  '  - [ ] Nested step | time:0 | agent:ui-bot | metadata:{"id":"card-1a"}',
  '- [ ] Plain card | time:0 | metadata:{"id":"card-2"}',
].join("\n");

const OLD_BOARD = [
  "---",
  "uuid: old-board",
  "title: Old Board",
  "checklistType: kanban",
  "---",
  '- [ ] Legacy card | status:todo | time:0 | assignee:bob | metadata:{"id":"old-1"}',
  '- [x] Done card | status:completed | time:0 | priority:high | metadata:{"id":"old-2"}',
].join("\n");

const listFrom = (content: string, id: string): Checklist => {
  const parsed = parseChecklistContent(content, id);
  return {
    id,
    uuid: parsed.uuid!,
    title: parsed.title,
    type: ChecklistsTypes.KANBAN,
    items: parsed.items,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...(parsed.specNote && { specNote: parsed.specNote }),
    ...(parsed.extraMetadata && { extraMetadata: parsed.extraMetadata }),
  };
};

describe("agent card segment and board spec pin", () => {
  it("reads the agent next to an untouched human assignee", () => {
    const parsed = parseChecklistContent(AGENT_BOARD, "agent-board");

    expect(parsed.items[0]).toMatchObject({ id: "card-1", assignee: "alice", agent: "parser-bot" });
    expect(parsed.items[0].children?.[0]).toMatchObject({ id: "card-1a", agent: "ui-bot" });
    expect(parsed.items[1].agent).toBeUndefined();
    expect(parsed.specNote).toBe(SPEC);
    expect(parsed.extraMetadata?.specNote).toBeUndefined();
  });

  it("writes the agent right after the assignee and the pin into the frontmatter", () => {
    const markdown = listToMarkdown(listFrom(AGENT_BOARD, "agent-board"));

    expect(markdown).toContain("| assignee:alice | agent:parser-bot | metadata:");
    expect(markdown).toContain("agent:ui-bot");
    expect(markdown).toContain(`specNote: ${SPEC}`);
    expect(markdown).not.toMatch(/Plain card[^\n]*agent:/);
  });

  it("round trips agent boards through both parsers the same way", () => {
    const written = listToMarkdown(listFrom(AGENT_BOARD, "agent-board"));
    const client = parseChecklistContent(written, "agent-board");
    const server = parseMarkdown(written, "agent-board", "Work", "alice");

    expect(client.specNote).toBe(SPEC);
    expect(server.specNote).toBe(SPEC);
    expect(server.extraMetadata?.specNote).toBeUndefined();
    const shape = (items: Checklist["items"]) =>
      items.map(({ id, assignee, agent, children }) => ({
        id,
        assignee,
        agent,
        children: children?.map((child) => ({ id: child.id, agent: child.agent })),
      }));
    expect(shape(server.items)).toEqual(shape(client.items));
    expect(listToMarkdown(listFrom(written, "agent-board"))).toBe(written);
  });

  it("leaves old boards without agents or a pin exactly as they were", () => {
    const once = listToMarkdown(listFrom(OLD_BOARD, "old-board"));
    const twice = listToMarkdown(listFrom(once, "old-board"));

    expect(twice).toBe(once);
    expect(once).not.toContain("agent:");
    expect(once).not.toContain("specNote");
    expect(parseChecklistContent(once, "old-board").items[0]).toMatchObject({ assignee: "bob" });
    expect(parseChecklistContent(once, "old-board").items[0].agent).toBeUndefined();
  });

  it("drops the pin and the agent when they are cleared", () => {
    const list = listFrom(AGENT_BOARD, "agent-board");
    const cleared = listToMarkdown({
      ...list,
      specNote: undefined,
      items: list.items.map((item) => ({ ...item, agent: undefined })),
    });

    expect(cleared).not.toContain("specNote");
    expect(cleared).not.toContain("agent:parser-bot");
    expect(cleared).toContain("assignee:alice");
  });

  it("keeps an agent on a simple list inside the item metadata", () => {
    const markdown = listToMarkdown({
      ...listFrom(AGENT_BOARD, "agent-board"),
      type: ChecklistsTypes.SIMPLE,
      items: [{ id: "s-1", text: "Step", completed: false, order: 0, agent: "parser-bot" }],
    });

    expect(markdown).toContain('"agent":"parser-bot"');
    expect(parseChecklistContent(markdown, "simple").items[0].agent).toBe("parser-bot");
  });

  it("keeps a note's own specNote frontmatter as its own metadata", () => {
    const note = parseNoteContent(
      ["---", `uuid: ${SPEC}`, "title: Mine", "specNote: my own field", "---", "", "# Mine"].join("\n"),
      "mine",
    );

    expect(note.extraMetadata).toEqual({ specNote: "my own field" });
  });

  it("does not keep the board pin twice in stray metadata", () => {
    expect(listFrom(AGENT_BOARD, "agent-board").extraMetadata?.specNote).toBeUndefined();
    expect(listToMarkdown(listFrom(AGENT_BOARD, "agent-board")).match(/specNote:/g)).toHaveLength(1);
  });
});
