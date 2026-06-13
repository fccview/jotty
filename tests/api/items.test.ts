import { describe, it, expect, beforeEach } from "vitest"
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetListById,
  mockCreateItem,
  mockUpdateItem,
  mockServerWriteFile,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup"

import { POST } from "@/app/api/checklists/[listId]/items/route"
import { PUT as CHECK } from "@/app/api/checklists/[listId]/items/[itemIndex]/check/route"
import { PUT as UNCHECK } from "@/app/api/checklists/[listId]/items/[itemIndex]/uncheck/route"
import { DELETE, PATCH } from "@/app/api/checklists/[listId]/items/[itemIndex]/route"

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
      mockCreateItem.mockResolvedValue({ success: true, data: { id: "new-item" } })

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
      mockCreateItem.mockResolvedValue({ success: true, data: { id: "new-task-item" } })

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
      mockUpdateItem.mockResolvedValue({ success: true })

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1/items/0/check")
      const response = await CHECK(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should check a nested item", async () => {
      mockGetListById.mockResolvedValue(mockList)
      mockUpdateItem.mockResolvedValue({ success: true })

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
      mockUpdateItem.mockResolvedValue({ success: true })

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1/items/0/uncheck")
      const response = await UNCHECK(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should uncheck a nested item", async () => {
      mockGetListById.mockResolvedValue(mockList)
      mockUpdateItem.mockResolvedValue({ success: true })

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
      mockUpdateItem.mockResolvedValue({ success: true })

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
      expect(mockUpdateItem).toHaveBeenCalledOnce()

      const formData = mockUpdateItem.mock.calls[0][1] as FormData
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
      expect(mockUpdateItem).not.toHaveBeenCalled()
    })

    it("should return 400 for invalid priority", async () => {
      const request = createMockRequest("PATCH", "http://localhost:3000/api/checklists/uuid-1/items/0", {
        priority: "urgent",
      })
      const response = await PATCH(request, { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain("'priority' must be one of")
      expect(mockUpdateItem).not.toHaveBeenCalled()
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
})
