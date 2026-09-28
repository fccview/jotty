import { describe, it, expect, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { ItemTypes, PermissionTypes } from "@/app/_types/enums"
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetListById,
  mockAddItem,
  mockEditItem,
  mockServerWriteFile,
  mockCanReach,
  mockRemoveItem,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup"

import { POST } from "@/app/api/checklists/[listId]/items/route"
import { PUT as CHECK } from "@/app/api/checklists/[listId]/items/[itemIndex]/check/route"
import { PUT as UNCHECK } from "@/app/api/checklists/[listId]/items/[itemIndex]/uncheck/route"
import { DELETE, PATCH } from "@/app/api/checklists/[listId]/items/[itemIndex]/route"
import { PUT as REORDER } from "@/app/api/checklists/[listId]/items/reorder/route"

describe("Checklist Items API", () => {
  const mockList = {
    id: "list-1",
    uuid: "uuid-1",
    title: "Test List",
    category: "Work",
    type: "simple",
    owner: "testuser",
    items: [
      {
        id: "item-1",
        text: "First Item",
        completed: false,
        children: [
          {
            id: "item-1-1",
            text: "Nested Item",
            completed: false,
            children: [
              {
                id: "item-1-1-1",
                text: "Deeply Nested Item",
                completed: false,
              },
            ],
          },
        ],
      },
      {
        id: "item-2",
        text: "Second Item",
        completed: false,
      },
    ],
  }

  beforeEach(() => {
    resetApiMocks()
    mockAuthenticateApiKey.mockResolvedValue(mockUser)
    mockServerWriteFile.mockResolvedValue(undefined)
  })

  describe("POST /api/checklists/:id/items", () => {
    it("should create a regular item", async () => {
      mockGetListById.mockResolvedValue(mockList)
      mockAddItem.mockResolvedValue({ success: true, data: { id: "new-item" } })

      const request = createMockRequest("POST", "http://localhost:3000/api/checklists/uuid-1/items", {
        text: "Test Item - Regular",
      })
      const response = await POST(request, { params: Promise.resolve({ listId: "uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should create a task item with status", async () => {
      const taskList = { ...mockList, type: "task" }
      mockGetListById.mockResolvedValue(taskList)
      mockAddItem.mockResolvedValue({ success: true, data: { id: "new-task-item" } })

      const request = createMockRequest("POST", "http://localhost:3000/api/checklists/uuid-1/items", {
        text: "Test Item - Task",
        status: "in_progress",
        time: 0,
      })
      const response = await POST(request, { params: Promise.resolve({ listId: "uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should create a nested item", async () => {
      mockGetListById.mockResolvedValue(mockList)

      const request = createMockRequest("POST", "http://localhost:3000/api/checklists/uuid-1/items", {
        text: "Nested Item - Child of Item 0",
        parentIndex: "0",
      })
      const response = await POST(request, { params: Promise.resolve({ listId: "uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should create a deeply nested item", async () => {
      mockGetListById.mockResolvedValue(mockList)

      const request = createMockRequest("POST", "http://localhost:3000/api/checklists/uuid-1/items", {
        text: "Deeply Nested Item - Grandchild",
        parentIndex: "0.0",
      })
      const response = await POST(request, { params: Promise.resolve({ listId: "uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 400 when text is missing", async () => {
      mockGetListById.mockResolvedValue(mockList)

      const request = createMockRequest("POST", "http://localhost:3000/api/checklists/uuid-1/items", {})
      const response = await POST(request, { params: Promise.resolve({ listId: "uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Text is required")
    })

    it("should return 404 for non-existent list", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("POST", "http://localhost:3000/api/checklists/nonexistent/items", {
        text: "Test Item",
      })
      const response = await POST(request, { params: Promise.resolve({ listId: "nonexistent" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("List not found")
    })

    it("should return 404 for non-existent parent item", async () => {
      mockGetListById.mockResolvedValue(mockList)

      const request = createMockRequest("POST", "http://localhost:3000/api/checklists/uuid-1/items", {
        text: "Nested Item",
        parentIndex: "999",
      })
      const response = await POST(request, { params: Promise.resolve({ listId: "uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Parent item not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("POST", "http://localhost:3000/api/checklists/uuid-1/items", {
        text: "Test Item",
      })
      const response = await POST(request, { params: Promise.resolve({ listId: "uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("PUT /api/checklists/:id/items/:index/check", () => {
    it("should check an item", async () => {
      mockGetListById.mockResolvedValue(mockList)
      mockEditItem.mockResolvedValue({ success: true })

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1/items/0/check")
      const response = await CHECK(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should check a nested item", async () => {
      mockGetListById.mockResolvedValue(mockList)
      mockEditItem.mockResolvedValue({ success: true })

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1/items/0.0/check")
      const response = await CHECK(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0.0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 404 for non-existent list", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/nonexistent/items/0/check")
      const response = await CHECK(request, { params: Promise.resolve({ listId: "nonexistent", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("List not found")
    })

    it("should return 400 for item index out of range", async () => {
      mockGetListById.mockResolvedValue(mockList)

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1/items/999/check")
      const response = await CHECK(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "999" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Item index out of range")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1/items/0/check")
      const response = await CHECK(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("PUT /api/checklists/:id/items/:index/uncheck", () => {
    it("should uncheck an item", async () => {
      mockGetListById.mockResolvedValue(mockList)
      mockEditItem.mockResolvedValue({ success: true })

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1/items/0/uncheck")
      const response = await UNCHECK(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should uncheck a nested item", async () => {
      mockGetListById.mockResolvedValue(mockList)
      mockEditItem.mockResolvedValue({ success: true })

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1/items/0.0/uncheck")
      const response = await UNCHECK(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0.0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 404 for non-existent list", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/nonexistent/items/0/uncheck")
      const response = await UNCHECK(request, { params: Promise.resolve({ listId: "nonexistent", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("List not found")
    })

    it("should return 400 for item index out of range", async () => {
      mockGetListById.mockResolvedValue(mockList)

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1/items/999/uncheck")
      const response = await UNCHECK(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "999" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Item index out of range")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1/items/0/uncheck")
      const response = await UNCHECK(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("PATCH /api/checklists/:id/items/:index", () => {
    it("should update writable kanban item fields", async () => {
      mockGetListById.mockResolvedValue({ ...mockList, type: "kanban" })
      mockEditItem.mockResolvedValue({ success: true })

      const request = createMockRequest("PATCH", "http://localhost:3000/api/checklists/uuid-1/items/0", {
        description: "Implementation notes",
        priority: "high",
        score: 5,
        startDate: "2026-06-10",
        targetDate: "2026-06-15",
        estimatedTime: 2.5,
      })
      const response = await PATCH(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockEditItem).toHaveBeenCalledOnce()

      const formData = mockEditItem.mock.calls[0][2] as FormData
      expect(formData.get("itemId")).toBe("item-1")
      expect(formData.get("description")).toBe("Implementation notes")
      expect(formData.get("priority")).toBe("high")
      expect(formData.get("score")).toBe("5")
      expect(formData.get("startDate")).toBe("2026-06-10")
      expect(formData.get("targetDate")).toBe("2026-06-15")
      expect(formData.get("estimatedTime")).toBe("2.5")
    })

    it("should return 400 when no patch fields are provided", async () => {
      const request = createMockRequest("PATCH", "http://localhost:3000/api/checklists/uuid-1/items/0", {})
      const response = await PATCH(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Provide at least one field to update")
      expect(mockEditItem).not.toHaveBeenCalled()
    })

    it("should return 400 for invalid priority", async () => {
      const request = createMockRequest("PATCH", "http://localhost:3000/api/checklists/uuid-1/items/0", {
        priority: "urgent",
      })
      const response = await PATCH(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain("'priority' must be one of")
      expect(mockEditItem).not.toHaveBeenCalled()
    })
  })

  describe("DELETE /api/checklists/:id/items/:index", () => {
    it("should delete an item", async () => {
      mockGetListById.mockResolvedValue(mockList)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/checklists/uuid-1/items/1")
      const response = await DELETE(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should delete a nested item", async () => {
      mockGetListById.mockResolvedValue(mockList)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/checklists/uuid-1/items/0.0")
      const response = await DELETE(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0.0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should delete a deeply nested item", async () => {
      mockGetListById.mockResolvedValue(mockList)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/checklists/uuid-1/items/0.0.0")
      const response = await DELETE(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0.0.0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 404 for non-existent list", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/checklists/nonexistent/items/0")
      const response = await DELETE(request, { params: Promise.resolve({ listId: "nonexistent", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("List not found")
    })

    it("should return 400 for item index out of range", async () => {
      mockGetListById.mockResolvedValue(mockList)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/checklists/uuid-1/items/999")
      const response = await DELETE(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "999" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Item index out of range")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/checklists/uuid-1/items/0")
      const response = await DELETE(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("PATCH /api/checklists/:id/items/:index validation", () => {
    const patch = (body: unknown) =>
      PATCH(createMockRequest("PATCH", "http://localhost:3000/api/checklists/uuid-1/items/0", body), {
        params: Promise.resolve({ listId: "uuid-1", itemIndex: "0" }),
      })

    it.each([
      [{ text: 5 }, "'text' must be a string"],
      [{ text: null }, "'text' must be a string"],
      [{ description: 1 }, "'description' must be a string"],
      [{ score: "5" }, "'score' must be a number"],
      [{ startDate: 20260610 }, "'startDate' must be a string"],
      [{ targetDate: true }, "'targetDate' must be a string"],
      [{ estimatedTime: "2h" }, "'estimatedTime' must be a number"],
      [{ unknown: "field" }, "Provide at least one field to update"],
    ])("refuses %j with %s", async (body, message) => {
      const response = await patch(body)

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe(message)
      expect(mockEditItem).not.toHaveBeenCalled()
    })

    it("clears fields sent as null", async () => {
      mockGetListById.mockResolvedValue({ ...mockList, type: "kanban" })
      mockEditItem.mockResolvedValue({ success: true })

      const response = await patch({ description: null, priority: null, score: null, estimatedTime: null })

      expect(response.status).toBe(200)
      const formData = mockEditItem.mock.calls[0][2] as FormData
      expect(formData.get("description")).toBe("")
      expect(formData.get("priority")).toBe("")
      expect(formData.get("score")).toBe("")
      expect(formData.get("estimatedTime")).toBe("")
      expect(formData.has("text")).toBe(false)
    })

    it("refuses a body that is not JSON", async () => {
      const request = new NextRequest(new URL("http://localhost:3000/api/checklists/uuid-1/items/0"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-api-key": "test-api-key" },
        body: "{not json",
      })
      const response = await PATCH(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0" }) })

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe("Request body must be valid JSON")
    })

    it("returns 400 for a malformed item index", async () => {
      mockGetListById.mockResolvedValue(mockList)

      const response = await PATCH(
        createMockRequest("PATCH", "http://localhost:3000/api/checklists/uuid-1/items/0.x", { text: "Milk" }),
        { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0.x" }) },
      )

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe("Invalid item index")
    })
  })

  describe("DELETE /api/checklists/:id/items/:index permissions", () => {
    it("refuses a user without the delete grant", async () => {
      mockGetListById.mockResolvedValue(mockList)
      mockCanReach.mockResolvedValue(false)

      const response = await DELETE(
        createMockRequest("DELETE", "http://localhost:3000/api/checklists/uuid-1/items/1"),
        { params: Promise.resolve({ listId: "uuid-1", itemIndex: "1" }) },
      )

      expect(response.status).toBe(403)
      expect(mockCanReach).toHaveBeenCalledWith("uuid-1", ItemTypes.CHECKLIST, "testuser", PermissionTypes.DELETE)
      expect(mockRemoveItem).not.toHaveBeenCalled()
    })
  })

  describe("PUT /api/checklists/:id/items/reorder", () => {
    const reorder = (body: unknown) =>
      REORDER(createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1/items/reorder", body), {
        params: Promise.resolve({ listId: "uuid-1" }),
      })

    it.each([
      [{ overItemId: "item-2" }, "'activeItemId' and 'overItemId' are required"],
      [{ activeItemId: "item-2", overItemId: "" }, "'activeItemId' and 'overItemId' are required"],
      [{ activeItemId: "item-2", overItemId: "item-1", position: "middle" }, "'position' must be 'before' or 'after'"],
    ])("refuses %j with %s", async (body, message) => {
      const response = await reorder(body)

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe(message)
      expect(mockGetListById).not.toHaveBeenCalled()
    })

    it("returns 404 when the list is not visible", async () => {
      mockGetListById.mockResolvedValue(undefined)

      const response = await reorder({ activeItemId: "item-2", overItemId: "item-1" })

      expect(response.status).toBe(404)
      expect((await getResponseJson(response)).error).toBe("List not found")
    })

    it("refuses a user without the edit grant", async () => {
      mockGetListById.mockResolvedValue(mockList)
      mockCanReach.mockResolvedValue(false)

      const response = await reorder({ activeItemId: "item-2", overItemId: "item-1" })

      expect(response.status).toBe(403)
      expect(mockCanReach).toHaveBeenCalledWith("uuid-1", ItemTypes.CHECKLIST, "testuser", PermissionTypes.EDIT)
      expect(mockServerWriteFile).not.toHaveBeenCalled()
    })

    it("does nothing when an item is dropped into its own descendant", async () => {
      mockGetListById.mockResolvedValue(mockList)

      const response = await reorder({ activeItemId: "item-1", overItemId: "item-1-1-1", isDropInto: true })

      expect(response.status).toBe(200)
      expect(await getResponseJson(response)).toEqual({ success: true })
      expect(mockServerWriteFile).not.toHaveBeenCalled()
    })

    it("returns 404 for an unknown item", async () => {
      mockGetListById.mockResolvedValue(mockList)

      const response = await reorder({ activeItemId: "ghost", overItemId: "item-1" })

      expect(response.status).toBe(404)
      expect((await getResponseJson(response)).error).toBe("Item not found")
    })
  })
})
