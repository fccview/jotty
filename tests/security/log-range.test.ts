import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockFs, resetAllMocks } from "../setup";
import { LOG_MAX_RANGE_DAYS, LOG_READ_BATCH_DAYS } from "@/app/_consts/logs";

vi.mock("@/app/_server/actions/file", () => ({
  readJsonFile: vi.fn().mockResolvedValue([]),
}));

import { digUpLogs } from "@/app/_server/actions/lib/audit-trail";
import { getDateRange } from "@/app/_server/actions/log/helpers";

describe("Security: audit log date ranges stay bounded", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("refuses to build a range longer than the cap", async () => {
    await expect(getDateRange(new Date("0001-01-01"), new Date("2026-01-01"))).rejects.toThrow(RangeError);
    expect(await getDateRange(new Date("2026-01-01"), new Date("2026-01-03"))).toHaveLength(3);
  });

  it(`never has more than ${LOG_READ_BATCH_DAYS} day files open at once`, async () => {
    let open = 0;
    let peak = 0;
    mockFs.readFile.mockImplementation(async () => {
      open++;
      peak = Math.max(peak, open);
      await new Promise((resolve) => setTimeout(resolve, 1));
      open--;
      return "[]";
    });

    await digUpLogs(["alice"], { startDate: "2025-10-01", endDate: "2026-09-28" });

    expect(mockFs.readFile.mock.calls.length).toBeLessThanOrEqual(LOG_MAX_RANGE_DAYS + 1);
    expect(peak).toBeLessThanOrEqual(LOG_READ_BATCH_DAYS);
  });
});
