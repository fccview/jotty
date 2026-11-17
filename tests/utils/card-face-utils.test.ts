import { describe, it, expect } from "vitest";
import { Item } from "@/app/_types";
import { shownPriority } from "@/app/_utils/kanban";
import { isFullyDone, splitByCompletion } from "@/app/_utils/item-tree-utils";

const item = (id: string, completed: boolean, children?: Item[]): Item => ({ id, text: id, completed, order: 0, children });

describe("shownPriority", () => {
  it.each(["critical", "high", "medium", "low"])("shows %s", (priority) => {
    expect(shownPriority(priority)).toBe(priority);
  });

  it.each([undefined, "", "none", "urgent", "HIGH"])("hides %j", (priority) => {
    expect(shownPriority(priority)).toBeNull();
  });
});

describe("splitByCompletion", () => {
  it("keeps a ticked parent with an open child in the to do pile", () => {
    const parent = item("party", true, [item("balloons", true), item("candles", false)]);
    expect(isFullyDone(parent)).toBe(false);
  });

  it("splits top level rows by whether the whole tree is done", () => {
    const rows = [
      item("milk", false),
      item("eggs", true),
      item("party", true, [item("balloons", true)]),
      item("cake", false, [item("candles", true)]),
    ];
    const { incompleteItems, completedItems } = splitByCompletion(rows);
    expect(incompleteItems.map((row) => row.id)).toEqual(["milk", "cake"]);
    expect(completedItems.map((row) => row.id)).toEqual(["eggs", "party"]);
  });
});
