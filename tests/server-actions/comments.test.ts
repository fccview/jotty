import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockRevalidatePath, resetAllMocks, createFormData } from "../setup";

const mockReadJsonFile = vi.fn();
const mockWriteJsonFile = vi.fn();
const mockEnsureDir = vi.fn();
const mockGetUsername = vi.fn();
const mockIsAdmin = vi.fn();
const mockCanReach = vi.fn();
const mockGetListById = vi.fn();
const mockBroadcast = vi.fn();
const mockGetUsers = vi.fn();
const mockCreateNotificationForUser = vi.fn();

vi.mock("@/app/_server/actions/file", () => ({
  readJsonFile: (...args: any[]) => mockReadJsonFile(...args),
  writeJsonFile: (...args: any[]) => mockWriteJsonFile(...args),
  ensureDir: (...args: any[]) => mockEnsureDir(...args),
}));

vi.mock("@/app/_server/actions/users", () => ({
  getUsername: (...args: any[]) => mockGetUsername(...args),
  isAdmin: (...args: any[]) => mockIsAdmin(...args),
  getUsers: (...args: any[]) => mockGetUsers(...args),
}));

vi.mock("@/app/_server/actions/share/queries", () => ({
  canReach: (...args: any[]) => mockCanReach(...args),
}));

vi.mock("@/app/_server/actions/checklist", () => ({
  getListById: (...args: any[]) => mockGetListById(...args),
}));

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: (...args: any[]) => mockBroadcast(...args),
}));

vi.mock("@/app/_server/actions/notifications/internal", () => ({
  notifyUser: (...args: any[]) => mockCreateNotificationForUser(...args),
}));

import {
  getComments,
  addComment,
  editComment,
  deleteComment,
} from "@/app/_server/actions/comments";

const BOARD_UUID = "board-uuid-123";
const ITEM_ID = "item-1";
const OWNER = "owneruser";

const mockChecklist = {
  id: "test-list",
  uuid: BOARD_UUID,
  title: "Test Board",
  category: "TestCategory",
  owner: OWNER,
  type: "task" as const,
  items: [{ id: ITEM_ID, text: "Task 1", completed: false, order: 0, status: "todo" }],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("Comments Actions", () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetUsername.mockResolvedValue("testuser");
    mockIsAdmin.mockResolvedValue(false);
    mockCanReach.mockResolvedValue(true);
    mockGetListById.mockResolvedValue(mockChecklist);
    mockReadJsonFile.mockResolvedValue({ items: {} });
    mockWriteJsonFile.mockResolvedValue(undefined);
    mockEnsureDir.mockResolvedValue(undefined);
    mockBroadcast.mockResolvedValue(undefined);
    mockGetUsers.mockResolvedValue([
      { username: "alice", isAdmin: false, isSuperAdmin: false, avatarUrl: "" },
      { username: "bob", isAdmin: false, isSuperAdmin: false, avatarUrl: "" },
      { username: "testuser", isAdmin: false, isSuperAdmin: false, avatarUrl: "" },
    ]);
    mockCreateNotificationForUser.mockResolvedValue({ success: true });
  });

  describe("getComments", () => {
    it("returns comments for an item when read access is granted", async () => {
      const existing = {
        items: {
          [ITEM_ID]: [
            { id: "c1", author: "alice", text: "hi", createdAt: "2024-01-01T00:00:00.000Z" },
          ],
        },
      };
      mockReadJsonFile.mockResolvedValue(existing);

      const result = await getComments(BOARD_UUID, ITEM_ID);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].text).toBe("hi");
      expect(mockCanReach).toHaveBeenCalledWith(
        BOARD_UUID,
        "checklist",
        "testuser",
        "canRead",
      );
    });

    it("returns an empty array when no comments exist", async () => {
      mockReadJsonFile.mockResolvedValue({ items: {} });

      const result = await getComments(BOARD_UUID, ITEM_ID);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("returns an error when the user lacks read access", async () => {
      mockCanReach.mockResolvedValue(false);

      const result = await getComments(BOARD_UUID, ITEM_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
    });

    it("returns an error when not authenticated", async () => {
      mockGetUsername.mockResolvedValue(null);

      const result = await getComments(BOARD_UUID, ITEM_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns an empty array when the sidecar file is missing (readJsonFile null)", async () => {
      mockReadJsonFile.mockResolvedValue(null);

      const result = await getComments(BOARD_UUID, ITEM_ID);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe("addComment", () => {
    it("adds a top-level comment and broadcasts an update", async () => {
      const writtenData = { items: {} as Record<string, any> };
      mockReadJsonFile.mockResolvedValue({ items: {} });
      mockWriteJsonFile.mockImplementation(async (data: any) => {
        writtenData.items = data.items;
      });

      const result = await addComment(
        createFormData({ uuid: BOARD_UUID, itemId: ITEM_ID, text: "Hello world" }),
      );

      expect(result.success).toBe(true);
      expect(result.data?.text).toBe("Hello world");
      expect(result.data?.author).toBe("testuser");
      expect(result.data?.id).toBeTruthy();
      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
      expect(writtenData.items[ITEM_ID]).toHaveLength(1);
      expect(writtenData.items[ITEM_ID][0].text).toBe("Hello world");
      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "checklist",
          action: "updated",
          entityId: BOARD_UUID,
        }),
      );
      expect(mockCanReach).toHaveBeenCalledWith(
        BOARD_UUID,
        "checklist",
        "testuser",
        "canEdit",
      );
    });

    it("adds a reply with parentId set", async () => {
      const parentComment = {
        id: "parent-1",
        author: "alice",
        text: "original",
        createdAt: "2024-01-01T00:00:00.000Z",
      };
      mockReadJsonFile.mockResolvedValue({
        items: { [ITEM_ID]: [parentComment] },
      });

      const result = await addComment(
        createFormData({
          uuid: BOARD_UUID,
          itemId: ITEM_ID,
          text: "a reply",
          parentId: "parent-1",
        }),
      );

      expect(result.success).toBe(true);
      expect(result.data?.parentId).toBe("parent-1");
    });

    it("fails when text is empty", async () => {
      const result = await addComment(
        createFormData({ uuid: BOARD_UUID, itemId: ITEM_ID, text: "   " }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Comment text cannot be empty");
      expect(mockWriteJsonFile).not.toHaveBeenCalled();
    });

    it("fails when uuid is missing", async () => {
      const result = await addComment(
        createFormData({ itemId: ITEM_ID, text: "hi" }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing board or item id");
    });

    it("fails when itemId is missing", async () => {
      const result = await addComment(
        createFormData({ uuid: BOARD_UUID, text: "hi" }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing board or item id");
    });

    it("fails without edit access", async () => {
      mockCanReach.mockResolvedValue(false);

      const result = await addComment(
        createFormData({ uuid: BOARD_UUID, itemId: ITEM_ID, text: "hi" }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
    });

    it("revalidates the checklist path after adding", async () => {
      await addComment(
        createFormData({ uuid: BOARD_UUID, itemId: ITEM_ID, text: "hi" }),
      );

      expect(mockRevalidatePath).toHaveBeenCalledWith(`/checklist/${BOARD_UUID}`);
    });
  });
  describe("@mention notifications", () => {
    it("sends a notification when a valid user is @mentioned in a new comment", async () => {
      mockReadJsonFile.mockResolvedValue({ items: {} });

      const result = await addComment(
        createFormData({
          uuid: BOARD_UUID,
          itemId: ITEM_ID,
          text: "Hey @alice check this out",
        }),
      );

      expect(result.success).toBe(true);
      expect(mockCreateNotificationForUser).toHaveBeenCalledTimes(1);
      expect(mockCreateNotificationForUser).toHaveBeenCalledWith(
        "alice",
        expect.objectContaining({
          type: "mention",
          titleKey: "mentionTitle",
          messageKey: "mentionMessage",
          messageVars: { user: "testuser", board: "Test Board" },
        }),
      );
    });

    it("sends notifications to multiple mentioned users", async () => {
      mockReadJsonFile.mockResolvedValue({ items: {} });

      await addComment(
        createFormData({
          uuid: BOARD_UUID,
          itemId: ITEM_ID,
          text: "@alice and @bob please review",
        }),
      );

      expect(mockCreateNotificationForUser).toHaveBeenCalledTimes(2);
      expect(mockCreateNotificationForUser).toHaveBeenCalledWith(
        "alice",
        expect.objectContaining({ type: "mention" }),
      );
      expect(mockCreateNotificationForUser).toHaveBeenCalledWith(
        "bob",
        expect.objectContaining({ type: "mention" }),
      );
    });

    it("does not send a notification to the comment author even if they @mention themselves", async () => {
      mockReadJsonFile.mockResolvedValue({ items: {} });

      await addComment(
        createFormData({
          uuid: BOARD_UUID,
          itemId: ITEM_ID,
          text: "note to @testuser",
        }),
      );

      expect(mockCreateNotificationForUser).not.toHaveBeenCalled();
    });

    it("does not send a notification for non-existent usernames", async () => {
      mockReadJsonFile.mockResolvedValue({ items: {} });

      await addComment(
        createFormData({
          uuid: BOARD_UUID,
          itemId: ITEM_ID,
          text: "hey @ghostuser",
        }),
      );

      expect(mockCreateNotificationForUser).not.toHaveBeenCalled();
    });

    it("deduplicates repeated mentions of the same user", async () => {
      mockReadJsonFile.mockResolvedValue({ items: {} });

      await addComment(
        createFormData({
          uuid: BOARD_UUID,
          itemId: ITEM_ID,
          text: "@alice @alice @alice",
        }),
      );

      expect(mockCreateNotificationForUser).toHaveBeenCalledTimes(1);
    });

    it("sends a notification when editing a comment to add an @mention", async () => {
      const existing = {
        items: {
          [ITEM_ID]: [
            { id: "c1", author: "testuser", text: "original", createdAt: "2024-01-01T00:00:00.000Z" },
          ],
        },
      };
      mockReadJsonFile.mockResolvedValue(existing);

      await editComment(
        createFormData({
          uuid: BOARD_UUID,
          itemId: ITEM_ID,
          commentId: "c1",
          text: "updated with @alice",
        }),
      );

      expect(mockCreateNotificationForUser).toHaveBeenCalledTimes(1);
      expect(mockCreateNotificationForUser).toHaveBeenCalledWith(
        "alice",
        expect.objectContaining({ type: "mention" }),
      );
    });

    it("does not send notifications when there are no mentions", async () => {
      mockReadJsonFile.mockResolvedValue({ items: {} });

      await addComment(
        createFormData({
          uuid: BOARD_UUID,
          itemId: ITEM_ID,
          text: "just a regular comment",
        }),
      );

      expect(mockCreateNotificationForUser).not.toHaveBeenCalled();
    });
  });

  describe("editComment", () => {
    it("edits a comment authored by the current user", async () => {
      const existing = {
        items: {
          [ITEM_ID]: [
            { id: "c1", author: "testuser", text: "old", createdAt: "2024-01-01T00:00:00.000Z" },
          ],
        },
      };
      mockReadJsonFile.mockResolvedValue(existing);

      const result = await editComment(
        createFormData({ uuid: BOARD_UUID, itemId: ITEM_ID, commentId: "c1", text: "new" }),
      );

      expect(result.success).toBe(true);
      expect(result.data?.text).toBe("new");
      expect(result.data?.updatedAt).toBeTruthy();
      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
    });

    it("allows an admin to edit another user's comment", async () => {
      mockIsAdmin.mockResolvedValue(true);
      const existing = {
        items: {
          [ITEM_ID]: [
            { id: "c1", author: "alice", text: "old", createdAt: "2024-01-01T00:00:00.000Z" },
          ],
        },
      };
      mockReadJsonFile.mockResolvedValue(existing);

      const result = await editComment(
        createFormData({ uuid: BOARD_UUID, itemId: ITEM_ID, commentId: "c1", text: "edited by admin" }),
      );

      expect(result.success).toBe(true);
      expect(result.data?.text).toBe("edited by admin");
    });

    it("denies editing another user's comment when not admin", async () => {
      const existing = {
        items: {
          [ITEM_ID]: [
            { id: "c1", author: "alice", text: "old", createdAt: "2024-01-01T00:00:00.000Z" },
          ],
        },
      };
      mockReadJsonFile.mockResolvedValue(existing);

      const result = await editComment(
        createFormData({ uuid: BOARD_UUID, itemId: ITEM_ID, commentId: "c1", text: "hack" }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
      expect(mockWriteJsonFile).not.toHaveBeenCalled();
    });

    it("fails when the comment does not exist", async () => {
      mockReadJsonFile.mockResolvedValue({ items: { [ITEM_ID]: [] } });

      const result = await editComment(
        createFormData({ uuid: BOARD_UUID, itemId: ITEM_ID, commentId: "nope", text: "x" }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Comment not found");
    });

    it("fails with empty text", async () => {
      const result = await editComment(
        createFormData({ uuid: BOARD_UUID, itemId: ITEM_ID, commentId: "c1", text: "" }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Comment text cannot be empty");
    });
  });

  describe("deleteComment", () => {
    it("deletes a comment authored by the current user", async () => {
      const existing = {
        items: {
          [ITEM_ID]: [
            { id: "c1", author: "testuser", text: "bye", createdAt: "2024-01-01T00:00:00.000Z" },
          ],
        },
      };
      mockReadJsonFile.mockResolvedValue(existing);

      const result = await deleteComment(
        createFormData({ uuid: BOARD_UUID, itemId: ITEM_ID, commentId: "c1" }),
      );

      expect(result.success).toBe(true);
      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
    });

    it("deletes a comment and its replies recursively", async () => {
      const existing = {
        items: {
          [ITEM_ID]: [
            { id: "c1", author: "testuser", text: "parent", createdAt: "2024-01-01T00:00:00.000Z" },
            { id: "c2", author: "alice", text: "reply 1", createdAt: "2024-01-01T00:00:00.000Z", parentId: "c1" },
            { id: "c3", author: "bob", text: "reply 2", createdAt: "2024-01-01T00:00:00.000Z", parentId: "c2" },
            { id: "c4", author: "carol", text: "unrelated", createdAt: "2024-01-01T00:00:00.000Z" },
          ],
        },
      };
      mockReadJsonFile.mockResolvedValue(existing);
      let written: any;
      mockWriteJsonFile.mockImplementation(async (data: any) => { written = data; });

      const result = await deleteComment(
        createFormData({ uuid: BOARD_UUID, itemId: ITEM_ID, commentId: "c1" }),
      );

      expect(result.success).toBe(true);
      expect(written.items[ITEM_ID]).toHaveLength(1);
      expect(written.items[ITEM_ID][0].id).toBe("c4");
    });

    it("allows an admin to delete another user's comment", async () => {
      mockIsAdmin.mockResolvedValue(true);
      const existing = {
        items: {
          [ITEM_ID]: [
            { id: "c1", author: "alice", text: "bye", createdAt: "2024-01-01T00:00:00.000Z" },
          ],
        },
      };
      mockReadJsonFile.mockResolvedValue(existing);

      const result = await deleteComment(
        createFormData({ uuid: BOARD_UUID, itemId: ITEM_ID, commentId: "c1" }),
      );

      expect(result.success).toBe(true);
    });

    it("denies deleting another user's comment when not admin", async () => {
      const existing = {
        items: {
          [ITEM_ID]: [
            { id: "c1", author: "alice", text: "bye", createdAt: "2024-01-01T00:00:00.000Z" },
          ],
        },
      };
      mockReadJsonFile.mockResolvedValue(existing);

      const result = await deleteComment(
        createFormData({ uuid: BOARD_UUID, itemId: ITEM_ID, commentId: "c1" }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
      expect(mockWriteJsonFile).not.toHaveBeenCalled();
    });

    it("fails when the comment does not exist", async () => {
      mockReadJsonFile.mockResolvedValue({ items: { [ITEM_ID]: [] } });

      const result = await deleteComment(
        createFormData({ uuid: BOARD_UUID, itemId: ITEM_ID, commentId: "nope" }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Comment not found");
    });
  });
});