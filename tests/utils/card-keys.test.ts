import { describe, it, expect } from "vitest";
import { cardKey, isCardRef } from "@/app/_utils/kanban/card-keys";
import { specTasks, taskFor } from "@/app/_utils/spec/roster";

const BOARD = "6857dc12-783a-4648-a5cb-0919e2ab1bd3";
const CARD = `${BOARD}-1790837674986`;

describe("card keys", () => {
  it("drops the board uuid from the front of a card id", () => {
    expect(cardKey(BOARD, CARD)).toBe("1790837674986");
    expect(cardKey(BOARD, "card-1")).toBe("card-1");
  });

  it("matches a card by its full id or its key, and nothing looser", () => {
    expect(isCardRef(BOARD, CARD, CARD)).toBe(true);
    expect(isCardRef(BOARD, CARD, " 1790837674986 ")).toBe(true);
    expect(isCardRef(BOARD, CARD, "179083767498")).toBe(false);
    expect(isCardRef(BOARD, CARD, BOARD)).toBe(false);
  });

  it("finds the task line written with the short key", () => {
    const tasks = specTasks("- `1790837674986` - fetch - agent `api-bot`");
    expect(taskFor(tasks, BOARD, CARD)).toMatchObject({ agent: "api-bot" });
  });
});
