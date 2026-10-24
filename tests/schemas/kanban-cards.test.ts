import { describe, it, expect } from "vitest";
import { cardBatchBody, cardCreateBody } from "@/app/_schemas/api/kanban";

describe("kanban card schemas", () => {
  it("takes whole scores only, so the stored score matches the one sent", () => {
    expect(cardCreateBody.safeParse({ text: "A", score: 3 }).success).toBe(true);
    expect(cardCreateBody.safeParse({ text: "A", score: 2.5 }).success).toBe(false);
  });

  it("refuses a batch that repeats an externalId", () => {
    const result = cardBatchBody.safeParse({
      cards: [
        { text: "A", externalId: "x", assignee: "alice" },
        { text: "B", externalId: "x", assignee: "bob" },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["cards", 1, "externalId"]);
  });

  it("lets cards without an externalId repeat freely", () => {
    expect(cardBatchBody.safeParse({ cards: [{ text: "A" }, { text: "A" }] }).success).toBe(true);
  });
});
