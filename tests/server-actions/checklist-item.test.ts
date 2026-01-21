import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockRevalidatePath, resetAllMocks, createFormData } from "../setup";

const mockGetUserModeDir = vi.fn();
const mockEnsureDir = vi.fn();
const mockServerWriteFile = vi.fn();
const mockGetUsername = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockIsAdmin = vi.fn();
const mockCheckUserPermission = vi.fn();
const mockGetUserChecklists = vi.fn();
const mockGetListById = vi.fn();
const mockGetAllLists = vi.fn();

vi.mock("@/app/_server/actions/file", () => ({
  getUserModeDir: (...args: any[]) => mockGetUserModeDir(...args),
  ensureDir: (...args: any[]) => mockEnsureDir(...args),
  serverWriteFile: (...args: any[]) => mockServerWriteFile(...args),
}));

vi.mock("@/app/_server/actions/users", () => ({
  getUsername: (...args: any[]) => mockGetUsername(...args),
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  isAdmin: (...args: any[]) => mockIsAdmin(...args),
}));

vi.mock("@/app/_server/actions/sharing", () => ({
  checkUserPermission: (...args: any[]) => mockCheckUserPermission(...args),
}));

vi.mock("@/app/_server/actions/checklist", () => ({
  getUserChecklists: (...args: any[]) => mockGetUserChecklists(...args),
  getListById: (...args: any[]) => mockGetListById(...args),
  getAllLists: (...args: any[]) => mockGetAllLists(...args),
}));

vi.mock("@/app/_utils/checklist-utils", () => ({
  listToMarkdown: vi.fn().mockReturnValue("# Test List\n- [ ] Item"),
}));

import {
  updateItem,
  createItem,
  deleteItem,
  updateItemStatus,
  createBulkItems,
  createSubItem,
  reorderItems,
  bulkToggleItems,
  bulkDeleteItems,
} from "@/app/_server/actions/checklist-item";

const mockChecklist = {
  id: "test-list",
  uuid: "test-uuid-123",
  title: "Test List",
  category: "TestCategory",
  owner: "testuser",
  type: "simple" as const,
  items: [
    { id: "item-1", text: "First item", completed: false, order: 0 },
    { id: "item-2", text: "Second item", completed: true, order: 1 },
    { id: "item-3", text: "Third item", completed: false, order: 2 },
  ],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockTaskChecklist = {
  ...mockChecklist,
  type: "task" as const,
  statuses: [
    { id: "todo", label: "To Do", color: "gray", order: 0 },
    { id: "in-progress", label: "In Progress", color: "blue", order: 1 },
    { id: "completed", label: "Completed", color: "green", order: 2 },
  ],
  items: [
    {
      id: "task-1",
      text: "Task 1",
      completed: false,
      order: 0,
      status: "todo",
    },
    {
      id: "task-2",
      text: "Task 2",
      completed: false,
      order: 1,
      status: "in-progress",
    },
    {
      id: "task-3",
      text: "Task 3",
      completed: true,
      order: 2,
      status: "completed",
    },
  ],
};

describe("Checklist Item Actions - Comprehensive Tests", () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetUserModeDir.mockResolvedValue("/data/checklists/testuser");
    mockEnsureDir.mockResolvedValue(undefined);
    mockServerWriteFile.mockResolvedValue(undefined);
    mockGetUsername.mockResolvedValue("testuser");
    mockGetCurrentUser.mockResolvedValue({ username: "testuser" });
    mockIsAdmin.mockResolvedValue(false);
    mockCheckUserPermission.mockResolvedValue(true);
    mockGetUserChecklists.mockResolvedValue({
      success: true,
      data: [mockChecklist],
    });
    mockGetListById.mockResolvedValue(mockChecklist);
    mockGetAllLists.mockResolvedValue({ success: true, data: [mockChecklist] });
  });

  describe("updateItem", () => {
    it("should update item text", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemId: "item-1",
        completed: "false",
        text: "Updated item text",
        category: "TestCategory",
      });

      const result = await updateItem(mockChecklist, formData);

      expect(result.success).toBe(true);
      expect(mockServerWriteFile).toHaveBeenCalled();
    });

    it("should mark item as completed", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemId: "item-1",
        completed: "true",
        category: "TestCategory",
      });

      const result = await updateItem(mockChecklist, formData);

      expect(result.success).toBe(true);
      const updatedItem = result.data?.items.find(
        (i: any) => i.id === "item-1",
      );
      expect(updatedItem?.completed).toBe(true);
    });

    it("should update item description", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemId: "item-1",
        completed: "false",
        description: "New description",
        category: "TestCategory",
      });

      const result = await updateItem(mockChecklist, formData);

      expect(result.success).toBe(true);
    });

    it("should return error when permission denied", async () => {
      mockCheckUserPermission.mockResolvedValue(false);

      const formData = createFormData({
        listId: "test-list",
        itemId: "item-1",
        completed: "false",
        category: "TestCategory",
      });

      const result = await updateItem(mockChecklist, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update item");
    });

    it("should skip revalidation when flag is set", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemId: "item-1",
        completed: "true",
        category: "TestCategory",
      });

      await updateItem(mockChecklist, formData, "testuser", true);

      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("should update child items when parent is completed", async () => {
      const checklistWithChildren = {
        ...mockChecklist,
        items: [
          {
            id: "parent-1",
            text: "Parent item",
            completed: false,
            order: 0,
            children: [
              { id: "child-1", text: "Child 1", completed: false, order: 0 },
              { id: "child-2", text: "Child 2", completed: false, order: 1 },
            ],
          },
        ],
      };

      const formData = createFormData({
        listId: "test-list",
        itemId: "parent-1",
        completed: "true",
        category: "TestCategory",
      });

      const result = await updateItem(checklistWithChildren, formData);

      expect(result.success).toBe(true);
    });

    it("should update due date for task items", async () => {
      mockGetListById.mockResolvedValue(mockTaskChecklist);

      const formData = createFormData({
        listId: "test-list",
        itemId: "task-1",
        completed: "false",
        dueDate: "2024-12-31",
        category: "TestCategory",
      });

      const result = await updateItem(mockTaskChecklist, formData);

      expect(result.success).toBe(true);
    });
  });

  describe("createItem", () => {
    it("should create a new item", async () => {
      const formData = createFormData({
        listId: "test-list",
        text: "New item",
        category: "TestCategory",
      });

      const result = await createItem(mockChecklist, formData);

      expect(result.success).toBe(true);
      expect(result.data?.text).toBe("New item");
      expect(result.data?.completed).toBe(false);
      expect(mockServerWriteFile).toHaveBeenCalled();
    });

    it("should create item with description", async () => {
      const formData = createFormData({
        listId: "test-list",
        text: "New item with desc",
        description: "Item description",
        category: "TestCategory",
      });

      const result = await createItem(mockChecklist, formData);

      expect(result.success).toBe(true);
      expect(result.data?.description).toBe("Item description");
    });

    it("should return error when permission denied", async () => {
      mockCheckUserPermission.mockResolvedValue(false);

      const formData = createFormData({
        listId: "test-list",
        text: "New item",
        category: "TestCategory",
      });

      const result = await createItem(mockChecklist, formData);

      expect(result.success).toBe(false);
    });

    it("should create task item with status for task checklists", async () => {
      const taskChecklist = { ...mockChecklist, type: "task" as const };

      const formData = createFormData({
        listId: "test-list",
        text: "New task",
        category: "TestCategory",
      });

      const result = await createItem(taskChecklist, formData);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBeDefined();
    });

    it("should create item with custom status for task checklists", async () => {
      mockGetListById.mockResolvedValue(mockTaskChecklist);

      const formData = createFormData({
        listId: "test-list",
        text: "New task in progress",
        status: "in-progress",
        category: "TestCategory",
      });

      const result = await createItem(mockTaskChecklist, formData);

      expect(result.success).toBe(true);
    });

    it("should create item with due date", async () => {
      const formData = createFormData({
        listId: "test-list",
        text: "Task with deadline",
        dueDate: "2024-12-25",
        category: "TestCategory",
      });

      const result = await createItem(mockChecklist, formData);

      expect(result.success).toBe(true);
    });
  });

  describe("deleteItem", () => {
    it("should delete an item", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemId: "item-1",
        category: "TestCategory",
      });

      const result = await deleteItem(formData);

      expect(result.success).toBe(true);
      expect(mockServerWriteFile).toHaveBeenCalled();
    });

    it("should return success when item does not exist", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemId: "nonexistent-item",
        category: "TestCategory",
      });

      const result = await deleteItem(formData);

      expect(result.success).toBe(true);
    });

    it("should handle list not found", async () => {
      mockGetUserChecklists.mockResolvedValue({ success: true, data: [] });

      const formData = createFormData({
        listId: "nonexistent-list",
        itemId: "item-1",
        category: "TestCategory",
      });

      const result = await deleteItem(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to delete item");
    });

    it("should delete item with children recursively", async () => {
      const checklistWithChildren = {
        ...mockChecklist,
        items: [
          {
            id: "parent-1",
            text: "Parent",
            completed: false,
            order: 0,
            children: [
              { id: "child-1", text: "Child", completed: false, order: 0 },
            ],
          },
        ],
      };
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [checklistWithChildren],
      });

      const formData = createFormData({
        listId: "test-list",
        itemId: "parent-1",
        category: "TestCategory",
      });

      const result = await deleteItem(formData);

      expect(result.success).toBe(true);
    });
  });

  describe("updateItemStatus (Task/Kanban)", () => {
    beforeEach(() => {
      mockGetListById.mockResolvedValue(mockTaskChecklist);
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [mockTaskChecklist],
      });
    });

    it("should return error when listId or itemId missing", async () => {
      const formData = createFormData({
        status: "in-progress",
      });

      const result = await updateItemStatus(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("List ID and item ID are required");
    });

    it("should return error when neither status nor timeEntries provided", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemId: "task-1",
        category: "TestCategory",
      });

      const result = await updateItemStatus(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Either status or timeEntries must be provided",
      );
    });

    it("should update item status", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemId: "task-1",
        status: "in-progress",
        category: "TestCategory",
      });

      const result = await updateItemStatus(formData);

      expect(result.success).toBe(true);
      expect(mockServerWriteFile).toHaveBeenCalled();
    });

    it("should update to completed status and mark item completed", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemId: "task-1",
        status: "completed",
        category: "TestCategory",
      });

      const result = await updateItemStatus(formData);

      expect(result.success).toBe(true);
    });

    it("should return error when permission denied", async () => {
      mockCheckUserPermission.mockResolvedValue(false);

      const formData = createFormData({
        listId: "test-list",
        itemId: "task-1",
        status: "in-progress",
        category: "TestCategory",
      });

      const result = await updateItemStatus(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
    });

    it("should return error when list not found", async () => {
      mockGetListById.mockResolvedValue(null);

      const formData = createFormData({
        listId: "nonexistent-list",
        itemId: "task-1",
        status: "in-progress",
        category: "TestCategory",
      });

      const result = await updateItemStatus(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("List not found");
    });

    it("should update time entries for task tracking", async () => {
      const timeEntries = [
        {
          start: "2024-01-01T09:00:00Z",
          end: "2024-01-01T12:00:00Z",
          duration: 10800000,
        },
      ];

      const formData = createFormData({
        listId: "test-list",
        itemId: "task-1",
        timeEntries: JSON.stringify(timeEntries),
        category: "TestCategory",
      });

      const result = await updateItemStatus(formData);

      expect(result.success).toBe(true);
    });

    it("should update child items when parent status changes", async () => {
      const taskWithChildren = {
        ...mockTaskChecklist,
        items: [
          {
            id: "parent-task",
            text: "Parent task",
            completed: false,
            order: 0,
            status: "todo",
            children: [
              {
                id: "child-task",
                text: "Child task",
                completed: false,
                order: 0,
                status: "todo",
              },
            ],
          },
        ],
      };
      mockGetListById.mockResolvedValue(taskWithChildren);

      const formData = createFormData({
        listId: "test-list",
        itemId: "parent-task",
        status: "completed",
        category: "TestCategory",
      });

      const result = await updateItemStatus(formData);

      expect(result.success).toBe(true);
    });
  });

  describe("createBulkItems", () => {
    it("should create multiple items from text", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemsText: "Item 1\nItem 2\nItem 3",
        category: "TestCategory",
      });

      const result = await createBulkItems(formData);

      expect(result.success).toBe(true);
      expect(result.data?.items.length).toBeGreaterThan(
        mockChecklist.items.length,
      );
      expect(mockServerWriteFile).toHaveBeenCalled();
    });

    it("should filter empty lines", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemsText: "Item 1\n\n\nItem 2",
        category: "TestCategory",
      });

      const result = await createBulkItems(formData);

      expect(result.success).toBe(true);
    });

    it("should handle list not found", async () => {
      mockGetUserChecklists.mockResolvedValue({ success: true, data: [] });

      const formData = createFormData({
        listId: "nonexistent-list",
        itemsText: "Item 1",
        category: "TestCategory",
      });

      const result = await createBulkItems(formData);

      expect(result.success).toBe(false);
    });

    it("should trim whitespace from items", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemsText: "  Item with spaces  \n  Another item  ",
        category: "TestCategory",
      });

      const result = await createBulkItems(formData);

      expect(result.success).toBe(true);
    });
  });

  describe("bulkToggleItems", () => {
    it("should toggle multiple items completed state", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemIds: JSON.stringify(["item-1", "item-3"]),
        category: "TestCategory",
      });

      const result = await bulkToggleItems(formData);

      expect(result.success).toBe(true);
      expect(mockServerWriteFile).toHaveBeenCalled();
    });

    it("should toggle all items when no specific ids provided", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemIds: JSON.stringify([]),
        toggleAll: "true",
        category: "TestCategory",
      });

      const result = await bulkToggleItems(formData);

      expect(result.success).toBe(true);
    });

    it("should handle list not found gracefully", async () => {
      mockGetListById.mockResolvedValue(null);

      const formData = createFormData({
        listId: "nonexistent",
        itemIds: JSON.stringify(["item-1"]),
        category: "TestCategory",
      });

      const result = await bulkToggleItems(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("List not found");
    });
  });

  describe("bulkDeleteItems", () => {
    it("should delete multiple items", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemIds: JSON.stringify(["item-1", "item-2"]),
        category: "TestCategory",
      });

      const result = await bulkDeleteItems(formData);

      expect(result.success).toBe(true);
      expect(mockServerWriteFile).toHaveBeenCalled();
    });

    it("should handle missing listId by returning no-op", async () => {
      const formData = createFormData({
        itemIds: JSON.stringify(["item-1"]),
        category: "TestCategory",
      });

      const result = await bulkDeleteItems(formData);

      expect(result.success).toBe(true);
    });

    it("should succeed with empty itemIds (no-op)", async () => {
      const formData = createFormData({
        listId: "test-list",
        itemIds: JSON.stringify([]),
        category: "TestCategory",
      });

      const result = await bulkDeleteItems(formData);

      expect(result.success).toBe(true);
    });

    it("should delete items and their children", async () => {
      const checklistWithChildren = {
        ...mockChecklist,
        items: [
          {
            id: "parent-1",
            text: "Parent",
            completed: false,
            order: 0,
            children: [
              { id: "child-1", text: "Child", completed: false, order: 0 },
            ],
          },
          { id: "item-2", text: "Standalone", completed: false, order: 1 },
        ],
      };
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [checklistWithChildren],
      });

      const formData = createFormData({
        listId: "test-list",
        itemIds: JSON.stringify(["parent-1"]),
        category: "TestCategory",
      });

      const result = await bulkDeleteItems(formData);

      expect(result.success).toBe(true);
    });
  });

  describe("reorderItems", () => {
    it("should reorder items within same level", async () => {
      const formData = createFormData({
        listId: "test-list",
        activeItemId: "item-3",
        overItemId: "item-1",
        category: "TestCategory",
      });

      const result = await reorderItems(formData);

      expect(result.success).toBe(true);
      expect(mockServerWriteFile).toHaveBeenCalled();
    });

    it("should move item to different position", async () => {
      const formData = createFormData({
        listId: "test-list",
        activeItemId: "item-1",
        overItemId: "item-3",
        category: "TestCategory",
      });

      const result = await reorderItems(formData);

      expect(result.success).toBe(true);
    });

    it("should return error when list not found", async () => {
      mockGetListById.mockResolvedValue(null);

      const formData = createFormData({
        listId: "nonexistent",
        itemId: "item-1",
        targetId: "item-2",
        position: "before",
        category: "TestCategory",
      });

      const result = await reorderItems(formData);

      expect(result.success).toBe(false);
    });

    it("should return generic error when permission denied", async () => {
      mockCheckUserPermission.mockResolvedValue(false);
      mockGetUserChecklists.mockResolvedValue({
        success: false,
        error: "Failed",
      });

      const formData = createFormData({
        listId: "test-list",
        activeItemId: "item-1",
        overItemId: "item-2",
        category: "TestCategory",
      });

      const result = await reorderItems(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to reorder items");
    });

    it("should prevent moving item under its own descendant", async () => {
      const checklistWithHierarchy = {
        ...mockChecklist,
        items: [
          {
            id: "parent-1",
            text: "Parent",
            completed: false,
            order: 0,
            children: [
              { id: "child-1", text: "Child", completed: false, order: 0 },
            ],
          },
        ],
      };
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [checklistWithHierarchy],
      });

      const formData = createFormData({
        listId: "test-list",
        activeItemId: "parent-1",
        overItemId: "child-1",
        isDropInto: "true",
        category: "TestCategory",
      });

      const result = await reorderItems(formData);

      expect(result.success).toBe(true);
    });
  });

  describe("createSubItem", () => {
    it("should create a sub-item under parent", async () => {
      const formData = createFormData({
        listId: "test-list",
        parentId: "item-1",
        text: "Sub item",
        category: "TestCategory",
      });

      const result = await createSubItem(formData);

      expect(result.success).toBe(true);
      expect(mockServerWriteFile).toHaveBeenCalled();
    });

    it("should return error when parent not found", async () => {
      const formData = createFormData({
        listId: "test-list",
        parentId: "nonexistent-parent",
        text: "Sub item",
        category: "TestCategory",
      });

      const result = await createSubItem(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to create sub-item");
    });

    it("should handle list not found", async () => {
      mockGetUserChecklists.mockResolvedValue({ success: true, data: [] });
      mockGetAllLists.mockResolvedValue({ success: true, data: [] });

      const formData = createFormData({
        listId: "nonexistent-list",
        parentId: "item-1",
        text: "Sub item",
        category: "TestCategory",
      });

      const result = await createSubItem(formData);

      expect(result.success).toBe(false);
    });

    it("should create sub-item with proper order", async () => {
      const checklistWithChildren = {
        ...mockChecklist,
        items: [
          {
            id: "parent-1",
            text: "Parent",
            completed: false,
            order: 0,
            children: [
              {
                id: "existing-child",
                text: "Existing",
                completed: false,
                order: 0,
              },
            ],
          },
        ],
      };
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [checklistWithChildren],
      });
      mockGetAllLists.mockResolvedValue({
        success: true,
        data: [checklistWithChildren],
      });

      const formData = createFormData({
        listId: "test-list",
        parentId: "parent-1",
        text: "New sub item",
        category: "TestCategory",
      });

      const result = await createSubItem(formData);

      expect(result.success).toBe(true);
    });
  });

  describe('Sharing Permissions - Checklist Item Operations', () => {
    const sharedChecklist = {
      ...mockChecklist,
      owner: 'owner-user',
    };

    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({ username: 'shared-user' });
      mockGetUsername.mockResolvedValue('shared-user');
      mockGetListById.mockResolvedValue(sharedChecklist);
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [sharedChecklist],
      });
    });

    describe('updateItem - Shared Access', () => {
      it('should allow checking/unchecking items with edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'item-1',
          completed: 'true',
          category: 'TestCategory',
        });

        const result = await updateItem(sharedChecklist, formData, 'shared-user');

        expect(result.success).toBe(true);
        expect(mockCheckUserPermission).toHaveBeenCalled();
      });

      it('should deny checking items with read-only permission', async () => {
        mockCheckUserPermission.mockResolvedValue(false);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'item-1',
          completed: 'true',
          category: 'TestCategory',
        });

        const result = await updateItem(sharedChecklist, formData, 'shared-user');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to update item');
      });

      it('should allow renaming items with edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'item-1',
          text: 'Renamed item',
          completed: 'false',
          category: 'TestCategory',
        });

        const result = await updateItem(sharedChecklist, formData, 'shared-user');

        expect(result.success).toBe(true);
      });

      it('should deny renaming items with read-only permission', async () => {
        mockCheckUserPermission.mockResolvedValue(false);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'item-1',
          text: 'Renamed item',
          category: 'TestCategory',
        });

        const result = await updateItem(sharedChecklist, formData, 'shared-user');

        expect(result.success).toBe(false);
      });

      it('should allow updating item description with edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'item-1',
          description: 'Updated description',
          completed: 'false',
          category: 'TestCategory',
        });

        const result = await updateItem(sharedChecklist, formData, 'shared-user');

        expect(result.success).toBe(true);
      });

      it('should allow updating due date with edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'item-1',
          dueDate: '2024-12-31',
          completed: 'false',
          category: 'TestCategory',
        });

        const result = await updateItem(sharedChecklist, formData, 'shared-user');

        expect(result.success).toBe(true);
      });

      it('should allow toggling parent item with edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);
        const checklistWithChildren = {
          ...sharedChecklist,
          items: [
            {
              id: 'parent-1',
              text: 'Parent',
              completed: false,
              order: 0,
              children: [
                { id: 'child-1', text: 'Child 1', completed: false, order: 0 },
                { id: 'child-2', text: 'Child 2', completed: false, order: 1 },
              ],
            },
          ],
        };

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'parent-1',
          completed: 'true',
          category: 'TestCategory',
        });

        const result = await updateItem(checklistWithChildren, formData, 'shared-user');

        expect(result.success).toBe(true);
      });
    });

    describe('createItem - Shared Access', () => {
      it('should allow creating items with edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          text: 'New shared item',
          category: 'TestCategory',
        });

        const result = await createItem(sharedChecklist, formData, 'shared-user');

        expect(result.success).toBe(true);
        expect(result.data?.text).toBe('New shared item');
      });

      it('should deny creating items with read-only permission', async () => {
        mockCheckUserPermission.mockResolvedValue(false);

        const formData = createFormData({
          listId: 'test-list',
          text: 'New item',
          category: 'TestCategory',
        });

        const result = await createItem(sharedChecklist, formData, 'shared-user');

        expect(result.success).toBe(false);
      });

      it('should allow creating items with description with edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          text: 'Item with desc',
          description: 'Description text',
          category: 'TestCategory',
        });

        const result = await createItem(sharedChecklist, formData, 'shared-user');

        expect(result.success).toBe(true);
      });
    });

    describe('deleteItem - Shared Access', () => {
      it('should allow deleting items with delete permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'item-1',
          category: 'TestCategory',
        });

        const result = await deleteItem(formData);

        expect(result.success).toBe(true);
      });

      it('should deny deleting items without delete permission', async () => {
        mockCheckUserPermission.mockResolvedValue(false);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'item-1',
          category: 'TestCategory',
        });

        const result = await deleteItem(formData);

        expect(result.success).toBe(false);
      });

      it('should check delete permission specifically', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'item-1',
          category: 'TestCategory',
        });

        await deleteItem(formData);

        expect(mockCheckUserPermission).toHaveBeenCalled();
      });
    });

    describe('updateItemStatus - Shared Access (Task Items)', () => {
      beforeEach(() => {
        const sharedTaskChecklist = {
          ...mockTaskChecklist,
          owner: 'owner-user',
        };
        mockGetListById.mockResolvedValue(sharedTaskChecklist);
        mockGetUserChecklists.mockResolvedValue({
          success: true,
          data: [sharedTaskChecklist],
        });
      });

      it('should allow updating status with edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'task-1',
          status: 'in-progress',
          category: 'TestCategory',
        });

        const result = await updateItemStatus(formData, 'shared-user');

        expect(result.success).toBe(true);
      });

      it('should deny updating status with read-only permission', async () => {
        mockCheckUserPermission.mockResolvedValue(false);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'task-1',
          status: 'in-progress',
          category: 'TestCategory',
        });

        const result = await updateItemStatus(formData, 'shared-user');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Permission denied');
      });

      it('should allow updating time entries with edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'task-1',
          timeEntries: JSON.stringify([
            { start: '2024-01-01T09:00:00Z', end: '2024-01-01T10:00:00Z', duration: 3600000 },
          ]),
          category: 'TestCategory',
        });

        const result = await updateItemStatus(formData, 'shared-user');

        expect(result.success).toBe(true);
      });

      it('should deny updating time entries without edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(false);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'task-1',
          timeEntries: JSON.stringify([
            { start: '2024-01-01T09:00:00Z', end: '2024-01-01T10:00:00Z', duration: 3600000 },
          ]),
          category: 'TestCategory',
        });

        const result = await updateItemStatus(formData, 'shared-user');

        expect(result.success).toBe(false);
      });
    });

    describe('createBulkItems - Shared Access', () => {
      it('should allow bulk creating items with edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          itemsText: 'Item 1\nItem 2\nItem 3',
          category: 'TestCategory',
        });

        const result = await createBulkItems(formData);

        expect(result.success).toBe(true);
      });

      it('should deny bulk creating items with read-only permission', async () => {
        mockCheckUserPermission.mockResolvedValue(false);

        const formData = createFormData({
          listId: 'test-list',
          itemsText: 'Item 1\nItem 2',
          category: 'TestCategory',
        });

        const result = await createBulkItems(formData);

        expect(result.success).toBe(false);
      });
    });

    describe('bulkToggleItems - Shared Access', () => {
      it('should allow bulk toggling with edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          itemIds: JSON.stringify(['item-1', 'item-2']),
          category: 'TestCategory',
        });

        const result = await bulkToggleItems(formData);

        expect(result.success).toBe(true);
      });

      it('should deny bulk toggling with read-only permission', async () => {
        mockCheckUserPermission.mockResolvedValue(false);

        const formData = createFormData({
          listId: 'test-list',
          itemIds: JSON.stringify(['item-1', 'item-2']),
          category: 'TestCategory',
        });

        const result = await bulkToggleItems(formData);

        expect(result.success).toBe(false);
      });

      it('should allow toggling all items with edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          itemIds: JSON.stringify([]),
          toggleAll: 'true',
          category: 'TestCategory',
        });

        const result = await bulkToggleItems(formData);

        expect(result.success).toBe(true);
      });
    });

    describe('bulkDeleteItems - Shared Access', () => {
      it('should allow bulk deleting with delete permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          itemIds: JSON.stringify(['item-1', 'item-2']),
          category: 'TestCategory',
        });

        const result = await bulkDeleteItems(formData);

        expect(result.success).toBe(true);
      });

      it('should deny bulk deleting without delete permission', async () => {
        mockCheckUserPermission.mockResolvedValue(false);

        const formData = createFormData({
          listId: 'test-list',
          itemIds: JSON.stringify(['item-1', 'item-2']),
          category: 'TestCategory',
        });

        const result = await bulkDeleteItems(formData);

        expect(result.success).toBe(false);
      });
    });

    describe('reorderItems - Shared Access', () => {
      it('should allow reordering items with edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          activeItemId: 'item-1',
          overItemId: 'item-3',
          category: 'TestCategory',
        });

        const result = await reorderItems(formData);

        expect(result.success).toBe(true);
      });

      it('should deny reordering items with read-only permission', async () => {
        mockCheckUserPermission.mockResolvedValue(false);
        mockGetUserChecklists.mockResolvedValue({
          success: false,
          error: 'Permission denied',
        });

        const formData = createFormData({
          listId: 'test-list',
          activeItemId: 'item-1',
          overItemId: 'item-3',
          category: 'TestCategory',
        });

        const result = await reorderItems(formData);

        expect(result.success).toBe(false);
      });
    });

    describe('createSubItem - Shared Access', () => {
      it('should allow creating sub-items with edit permission', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          parentId: 'item-1',
          text: 'New sub-item',
          category: 'TestCategory',
        });

        const result = await createSubItem(formData);

        expect(result.success).toBe(true);
      });

      it('should deny creating sub-items with read-only permission', async () => {
        mockCheckUserPermission.mockResolvedValue(false);

        const formData = createFormData({
          listId: 'test-list',
          parentId: 'item-1',
          text: 'New sub-item',
          category: 'TestCategory',
        });

        const result = await createSubItem(formData);

        expect(result.success).toBe(false);
      });
    });

    describe('Edge Cases - Shared Access', () => {
      it('should handle permission check for nested items', async () => {
        mockCheckUserPermission.mockResolvedValue(true);
        const checklistWithNested = {
          ...sharedChecklist,
          items: [
            {
              id: 'parent',
              text: 'Parent',
              completed: false,
              order: 0,
              children: [
                {
                  id: 'child',
                  text: 'Child',
                  completed: false,
                  order: 0,
                  children: [
                    { id: 'grandchild', text: 'Grandchild', completed: false, order: 0 },
                  ],
                },
              ],
            },
          ],
        };

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'grandchild',
          completed: 'true',
          category: 'TestCategory',
        });

        const result = await updateItem(checklistWithNested, formData, 'shared-user');

        expect(result.success).toBe(true);
      });

      it('should verify permission is checked before any item modification', async () => {
        mockCheckUserPermission.mockResolvedValue(false);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'item-1',
          completed: 'true',
          category: 'TestCategory',
        });

        const result = await updateItem(sharedChecklist, formData, 'shared-user');

        expect(result.success).toBe(false);
        expect(mockCheckUserPermission).toHaveBeenCalled();
        expect(mockServerWriteFile).not.toHaveBeenCalled();
      });

      it('should handle concurrent item updates with shared access', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData1 = createFormData({
          listId: 'test-list',
          itemId: 'item-1',
          completed: 'true',
          category: 'TestCategory',
        });

        const formData2 = createFormData({
          listId: 'test-list',
          itemId: 'item-2',
          completed: 'true',
          category: 'TestCategory',
        });

        const [result1, result2] = await Promise.all([
          updateItem(sharedChecklist, formData1, 'shared-user'),
          updateItem(sharedChecklist, formData2, 'shared-user'),
        ]);

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
      });

      it('should maintain item ownership metadata when shared user edits', async () => {
        mockCheckUserPermission.mockResolvedValue(true);

        const formData = createFormData({
          listId: 'test-list',
          itemId: 'item-1',
          text: 'Updated by shared user',
          completed: 'false',
          category: 'TestCategory',
        });

        const result = await updateItem(sharedChecklist, formData, 'shared-user');

        expect(result.success).toBe(true);
        expect(result.data?.owner).toBe('owner-user');
      });
    });
  });
});
