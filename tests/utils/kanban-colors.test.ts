import { describe, it, expect } from "vitest";
import { strayColor } from "@/app/_consts/kanban";

const column = (color?: string) => ({ id: "todo", label: "To Do", order: 0, color });

describe("strayColor", () => {
  it.each([undefined, "", "#3b82f6", "#3B82F6"])("lets %j through", (color) => {
    expect(strayColor([column(color)])).toBe(false);
  });

  it.each(["red", "#fff", "rgb(0 0 255)", "3b82f6"])("refuses a new %s", (color) => {
    expect(strayColor([column(color)])).toBe(true);
  });

  it("keeps a colour the column already has", () => {
    expect(strayColor([column("red")], [column("red")])).toBe(false);
  });

  it("refuses changing a column to another colour that is not hex", () => {
    expect(strayColor([column("blue")], [column("red")])).toBe(true);
  });

  it("does not let one column borrow another column's colour", () => {
    expect(strayColor([column("red")], [{ id: "done", label: "Done", order: 1, color: "red" }])).toBe(true);
  });
});
