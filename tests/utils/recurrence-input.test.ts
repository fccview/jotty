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

  it("refuses anything that repeats more often than daily, like the web app", () => {
    expect(isRecurrenceInput({ rrule: "FREQ=HOURLY", dtstart: "2030-01-07" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "freq=minutely;interval=5", dtstart: "2030-01-07" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "INTERVAL=1;FREQ=SECONDLY", dtstart: "1970-01-01T00:00:00Z" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=DAILY;BYHOUR=9,12,17", dtstart: "2030-01-07" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=WEEKLY;BYMINUTE=0,30", dtstart: "2030-01-07" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=DAILY;INTERVAL=2", dtstart: "2030-01-07" })).toBe(true);
    expect(isRecurrenceInput({ rrule: "FREQ=YEARLY", dtstart: "2030-01-07" })).toBe(true);
  });

  it("refuses intervals that are not positive whole numbers", () => {
    expect(isRecurrenceInput({ rrule: "FREQ=DAILY;INTERVAL=-1", dtstart: "2020-01-01T00:00:00Z" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=DAILY;INTERVAL=0", dtstart: "2020-01-01" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=WEEKLY;INTERVAL=1.5", dtstart: "2020-01-01" })).toBe(false);
  });

  it("refuses counts that are not positive whole numbers", () => {
    expect(isRecurrenceInput({ rrule: "FREQ=WEEKLY;COUNT=-1", dtstart: "2020-01-01" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=WEEKLY;COUNT=0", dtstart: "2020-01-01" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=WEEKLY;COUNT=3", dtstart: "2020-01-01" })).toBe(true);
  });

  it("refuses parts that could filter out every date", () => {
    expect(isRecurrenceInput({ rrule: "FREQ=DAILY;BYMONTH=2;BYMONTHDAY=30", dtstart: "2030-01-07" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=MONTHLY;BYMONTHDAY=15", dtstart: "2030-01-07" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=MONTHLY;BYDAY=+6MO", dtstart: "2030-01-07" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=WEEKLY;BYDAY=1MO", dtstart: "2030-01-07" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=DAILY;INTERVAL=7;BYDAY=TU", dtstart: "2030-01-07" })).toBe(false);
    expect(isRecurrenceInput({ rrule: "FREQ=YEARLY;BYSETPOS=40", dtstart: "2030-01-07" })).toBe(false);
  });

  it("refuses a start date hidden inside the rule", () => {
    expect(isRecurrenceInput({ rrule: "FREQ=DAILY;DTSTART=20310101T090000Z", dtstart: "2030-01-07T09:00:00Z" })).toBe(false);
  });

  it("accepts weekly weekdays with a count, an end and a week start", () => {
    expect(
      isRecurrenceInput({ rrule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH;WKST=SU;COUNT=10;UNTIL=20301231T000000Z", dtstart: "2030-01-07" }),
    ).toBe(true);
  });

  it("accepts lowercase rules, weekdays included", () => {
    expect(isRecurrenceInput({ rrule: "freq=weekly;byday=mo", dtstart: "2030-01-07" })).toBe(true);
    expect(ruleFrom({ rrule: "freq=weekly;byday=mo,fr", dtstart: "2030-01-07T09:00:00Z" })?.rrule).toBe("FREQ=WEEKLY;BYDAY=MO,FR");
  });

  it("schedules a series that started long ago", () => {
    const rule = ruleFrom({ rrule: "FREQ=DAILY", dtstart: "1800-01-01T09:00:00Z" });

    expect(new Date(rule!.nextDue!).getTime()).toBeGreaterThan(Date.now());
  });

  it("refuses counts too large to walk and dates it can't read", () => {
    expect(isRecurrenceInput({ rrule: "FREQ=DAILY;COUNT=50001", dtstart: "2020-01-01" })).toBe(false);
    expect(ruleFrom({ rrule: "FREQ=MONTHLY", dtstart: "0999-01-01T00:00:00Z" })).toBeUndefined();
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

  it("refuses a series that never has an occurrence", () => {
    expect(ruleFrom({ rrule: "FREQ=DAILY", dtstart: "2030-01-01T09:00:00Z", until: "2029-12-31T00:00:00Z" })).toBeUndefined();
    expect(ruleFrom({ rrule: "FREQ=DAILY;COUNT=1", dtstart: "2020-01-01T09:00:00Z" })).toBeUndefined();
  });

  it("leaves until out when the series never stops", () => {
    expect(ruleFrom({ rrule: "FREQ=MONTHLY", dtstart: "2030-01-07T09:00:00Z" })).not.toHaveProperty("until");
  });

  it("returns nothing for a refused rule", () => {
    expect(ruleFrom({ rrule: "nonsense", dtstart: "2030-01-07" })).toBeUndefined();
  });
});
