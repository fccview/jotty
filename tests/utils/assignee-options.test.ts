import { describe, it, expect } from "vitest";
import { assigneeChoices, MAX_PEOPLE_SHOWN } from "@/app/_utils/kanban/assignee-options";
import { AssigneeKinds, BoardPerson } from "@/app/_types/kanban-assignee";

const PEOPLE: BoardPerson[] = [
  { username: "alice", hasAccess: true },
  { username: "Bob", hasAccess: false },
  { username: "carol", hasAccess: true },
];

const kinds = (query: string, canShare = true) =>
  assigneeChoices(PEOPLE, query, canShare).options.map(({ pick }) => `${pick.kind}:${pick.name}`);

describe("assigneeChoices", () => {
  it("offers unassigned and everybody before anything is typed", () => {
    expect(kinds("")).toEqual(["none:", "user:alice", "user:Bob", "user:carol"]);
  });

  it("matches users as you type and offers the text as an agent too", () => {
    expect(kinds("al")).toEqual(["user:alice", "agent:al"]);
  });

  it("offers only the robot when nobody matches", () => {
    expect(kinds(" Parser-Bot ")).toEqual([`${AssigneeKinds.AGENT}:parser-bot`]);
  });

  it("never offers an agent named exactly like a user, whatever the case", () => {
    expect(kinds("bob")).toEqual(["user:Bob"]);
  });

  it("disables users without access when you can't share the board", () => {
    const bob = assigneeChoices(PEOPLE, "bob", false).options[0];
    expect(bob.disabled).toBe(true);
    expect(assigneeChoices(PEOPLE, "bob", true).options[0].disabled).toBe(false);
  });

  it("flags names that can't be an agent id instead of offering them", () => {
    const { options, invalidAgent } = assigneeChoices(PEOPLE, "bad | agent:x", true);
    expect(options).toEqual([]);
    expect(invalidAgent).toBe(true);
  });

  it("caps the user list", () => {
    const crowd = Array.from({ length: 20 }, (_, index) => ({ username: `user${index}`, hasAccess: true }));
    const users = assigneeChoices(crowd, "user", true).options.filter(
      ({ pick }) => pick.kind === AssigneeKinds.USER,
    );
    expect(users).toHaveLength(MAX_PEOPLE_SHOWN);
  });
});
