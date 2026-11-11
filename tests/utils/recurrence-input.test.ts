import { describe, it, expect } from "vitest";
import { isRecurrenceInput, ruleFrom } from "@/app/_utils/recurrence-utils";

describe("recurrence input from the REST API", () => {
  it("accepts a weekly rule with an ISO start", () => {
    expect(isRecurrenceInput({ rrule: "FREQ=WEEKLY;INTERVAL=1", dtstart: "2030-01-07T09:00:00.000Z" })).toBe(true);
  });

  it("refuses rules without FREQ, odd characters or bad dates", () => {
    expect(isRecurrenceInput({ rrule: "INTERVAL=2", dtstart: "2030-01-07" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=DAILY<script>", dtstart: "2030-01-07" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=DAILY", dtstart: "not a date" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=DAILY", dtstart: "2030-01-07", until: "nope" })).toBe(false);
  });

  it("normalises the rule and works out the next occurrence", () => {
    const rule = ruleFrom({ rrule: "freq=daily", dtstart: "2030-01-07T09:00:00Z", until: "2030-02-01T00:00:00Z" });

    expect(rule).toMatchObject({
      rrule: "FREQ=DAILY",
      dtstart: "2030-01-07T09:00:00.000Z",
      until: "2030-02-01T00:00:00.000Z",
    });
    expect(rule?.nextDue).toBeDefined();
  });

  it("leaves until out when the series never stops", () => {
    expect(ruleFrom({ rrule: "FREQ=MONTHLY", dtstart: "2030-01-07T09:00:00Z" })).not.toHaveProperty("until");
  });

  it("returns nothing for a refused rule", () => {
    expect(ruleFrom({ rrule: "nonsense", dtstart: "2030-01-07" })).toBeUndefined();
  });
});
