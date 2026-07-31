import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetAllMocks } from "../setup";

const mockDeleteList = vi.fn();

vi.mock("@/app/_server/actions/checklist", () => ({
  deleteList: (...args: any[]) => mockDeleteList(...args),
}));

import { runListDelete } from "@/app/_hooks/lib/delete-list";

describe("runListDelete", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("should report success when the action deletes the list", async () => {
    mockDeleteList.mockResolvedValue({ success: true });

    const outcome = await runListDelete("uuid-1");

    expect(outcome.ok).toBe(true);
    expect(mockDeleteList).toHaveBeenCalledTimes(1);
  });

  it("should pass the uuid through the form data", async () => {
    mockDeleteList.mockResolvedValue({ success: true });

    await runListDelete("uuid-1");

    const formData = mockDeleteList.mock.calls[0][0] as FormData;
    expect(formData.get("uuid")).toBe("uuid-1");
  });

  it("should report the error a failed action returns", async () => {
    mockDeleteList.mockResolvedValue({ error: "Permission denied" });

    const outcome = await runListDelete("uuid-1");

    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBe("Permission denied");
  });

  it("should report failure when the action rejects", async () => {
    mockDeleteList.mockRejectedValue(new Error("Network gone"));

    const outcome = await runListDelete("uuid-1");

    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBeUndefined();
  });

  it("should report failure when the action resolves to nothing", async () => {
    mockDeleteList.mockResolvedValue(undefined);

    const outcome = await runListDelete("uuid-1");

    expect(outcome.ok).toBe(false);
  });
});
