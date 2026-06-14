import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetAllMocks, createFormData } from "../setup";

const mockEnsureDir = vi.fn();
const mockServerWriteFile = vi.fn();
const mockGetUsername = vi.fn();
const mockCheckUserPermission = vi.fn();
const mockGetListById = vi.fn();
const mockBroadcast = vi.fn();

vi.mock("@/app/_server/actions/file", () => ({
  ensureDir: (...args: unknown[]) => mockEnsureDir(...args),
  serverWriteFile: (...args: unknown[]) => mockServerWriteFile(...args),
}));

vi.mock("@/app/_server/actions/users", () => ({
  getUsername: (...args: unknown[]) => mockGetUsername(...args),
}));

vi.mock("@/app/_server/actions/sharing", () => ({
  checkUserPermission: (...args: unknown[]) => mockCheckUserPermission(...args),
}));

vi.mock("@/app/_server/actions/checklist", () => ({
  getListById: (...args: unknown[]) => mockGetListById(...args),
}));

vi.mock("@/app/_server/ws/broadcast", () => ({
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));

vi.mock("@/app/_utils/checklist-utils", () => ({
  listToMarkdown: vi.fn().mockReturnValue("# Test Board"),
}));

import { dropItem } from "@/app/_server/actions/checklist-item";

const BOARD_UUID = "12345678-1234-1234-1234-123456789abc";

const mockBoard = {
  id: "test-board",
  uuid: BOARD_UUID,
  title: "Test Board",
  category: "TestCategory",
  owner: "testuser",
  type: "kanban" as const,
  statuses: [
    { id: "todo", label: "To Do", order: 0, autoComplete: false },
    { id: "in_progress", label: "In Progress", order: 1, autoComplete: false },
    { id: "completed", label: "Completed", order: 2, autoComplete: true },
  ],
  items: [
    { id: "task-1", text: "Task 1", completed: false, order: 0, status: "todo" },
    { id: "task-2", text: "Task 2", completed: false, order: 1, status: "todo" },
    {
      id: "task-3",
      text: "Task 3",
      completed: false,
      order: 2,
      status: "in_progress",
    },
  ],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("dropItem", () => {
  beforeEach(() => {
    resetAllMocks();
    mockEnsureDir.mockResolvedValue(undefined);
    mockServerWriteFile.mockResolvedValue(undefined);
    mockGetUsername.mockResolvedValue("testuser");
    mockCheckUserPermission.mockResolvedValue(true);
    mockBroadcast.mockResolvedValue(undefined);
    mockGetListById.mockImplementation(async (id: string) =>
      id === BOARD_UUID ? structuredClone(mockBoard) : undefined,
    );
  });

  it("moves an item cross-column to the exact index", async () => {
    const result = await dropItem(
      createFormData({
        uuid: BOARD_UUID,
        itemId: "task-1",
        targetStatus: "in_progress",
        targetIndex: "0",
      }),
    );

    expect(result.success).toBe(true);
    const inProgress = result.data!.items.filter(
      (i) => i.status === "in_progress",
    );
    expect(inProgress.map((i) => i.id)).toEqual(["task-1", "task-3"]);
    expect(result.data!.items.map((i) => i.order)).toEqual([0, 1, 2]);
    expect(mockServerWriteFile).toHaveBeenCalledTimes(1);
    expect(mockBroadcast).toHaveBeenCalledTimes(1);
    expect(mockBroadcast).toHaveBeenCalledWith({
      type: "checklist",
      action: "updated",
      entityId: "test-board",
      username: "testuser",
    });
  });

  it("reorders within a column", async () => {
    const result = await dropItem(
      createFormData({
        uuid: BOARD_UUID,
        itemId: "task-1",
        targetStatus: "todo",
        targetIndex: "2",
      }),
    );

    expect(result.success).toBe(true);
    const todo = result.data!.items.filter((i) => i.status === "todo");
    expect(todo.map((i) => i.id)).toEqual(["task-2", "task-1"]);
  });

  it("marks the item completed when dropped on an autoComplete column", async () => {
    const result = await dropItem(
      createFormData({
        uuid: BOARD_UUID,
        itemId: "task-1",
        targetStatus: "completed",
        targetIndex: "0",
      }),
    );

    expect(result.success).toBe(true);
    const moved = result.data!.items.find((i) => i.id === "task-1");
    expect(moved?.completed).toBe(true);
    expect(moved?.status).toBe("completed");
  });

  it("clamps an out-of-range index to the column end", async () => {
    const result = await dropItem(
      createFormData({
        uuid: BOARD_UUID,
        itemId: "task-1",
        targetStatus: "in_progress",
        targetIndex: "99",
      }),
    );

    expect(result.success).toBe(true);
    const inProgress = result.data!.items.filter(
      (i) => i.status === "in_progress",
    );
    expect(inProgress.map((i) => i.id)).toEqual(["task-3", "task-1"]);
  });

  it("rejects when required fields are missing", async () => {
    const result = await dropItem(
      createFormData({ uuid: BOARD_UUID, itemId: "task-1" }),
    );

    expect(result.success).toBe(false);
    expect(mockServerWriteFile).not.toHaveBeenCalled();
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it("rejects an unknown list uuid", async () => {
    const result = await dropItem(
      createFormData({
        uuid: "00000000-0000-0000-0000-000000000000",
        itemId: "task-1",
        targetStatus: "todo",
        targetIndex: "0",
      }),
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("List not found");
  });

  it("rejects an unknown item", async () => {
    const result = await dropItem(
      createFormData({
        uuid: BOARD_UUID,
        itemId: "nope",
        targetStatus: "todo",
        targetIndex: "0",
      }),
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Item not found");
    expect(mockServerWriteFile).not.toHaveBeenCalled();
  });

  it("rejects without edit permission", async () => {
    mockCheckUserPermission.mockResolvedValue(false);

    const result = await dropItem(
      createFormData({
        uuid: BOARD_UUID,
        itemId: "task-1",
        targetStatus: "todo",
        targetIndex: "0",
      }),
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Permission denied");
    expect(mockServerWriteFile).not.toHaveBeenCalled();
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it("returns a failure result when the write blows up", async () => {
    mockServerWriteFile.mockRejectedValue(new Error("disk full"));

    const result = await dropItem(
      createFormData({
        uuid: BOARD_UUID,
        itemId: "task-1",
        targetStatus: "todo",
        targetIndex: "0",
      }),
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to drop item");
    expect(mockBroadcast).not.toHaveBeenCalled();
  });
});
