import { describe, it, expect, beforeEach } from "vitest"
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetUserChecklists,
  mockCreateList,
  mockUpdateList,
  mockDeleteList,
  mockGetListById,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup"

import { GET, POST } from "@/app/api/checklists/route"
import { PUT, DELETE } from "@/app/api/checklists/[listId]/route"

describe("Checklists API", () => {
  beforeEach(() => {
    resetApiMocks()
    mockAuthenticateApiKey.mockResolvedValue(mockUser)
  })

  describe("GET /api/checklists", () => {
    it("should return checklists array", async () => {
      const mockChecklists = [
        {
          id: "list-1",
          uuid: "uuid-1",
          title: "Test Checklist",
          category: "Work",
          type: "simple",
          items: [],
          owner: "testuser",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]
      mockGetUserChecklists.mockResolvedValue({ success: true, data: mockChecklists })

      const request = createMockRequest("GET", "http://localhost:3000/api/checklists")
      const response = await GET(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(Array.isArray(data.checklists)).toBe(true)
      expect(data.checklists).toHaveLength(1)
      expect(data.checklists[0].title).toBe("Test Checklist")
    })

    it("should filter checklists by category", async () => {
      const mockChecklists = [
        { id: "1", uuid: "uuid-1", title: "Work List", category: "Work", type: "simple", items: [], owner: "testuser" },
        { id: "2", uuid: "uuid-2", title: "Personal List", category: "Personal", type: "simple", items: [], owner: "testuser" },
      ]
      mockGetUserChecklists.mockResolvedValue({ success: true, data: mockChecklists })

      const request = createMockRequest("GET", "http://localhost:3000/api/checklists?category=Work")
      const response = await GET(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.checklists).toHaveLength(1)
      expect(data.checklists[0].category).toBe("Work")
    })

    it("should filter checklists by type", async () => {
      const mockChecklists = [
        { id: "1", uuid: "uuid-1", title: "Simple List", category: "Work", type: "simple", items: [], owner: "testuser" },
        { id: "2", uuid: "uuid-2", title: "Task List", category: "Work", type: "task", items: [], owner: "testuser" },
      ]
      mockGetUserChecklists.mockResolvedValue({ success: true, data: mockChecklists })

      const request = createMockRequest("GET", "http://localhost:3000/api/checklists?type=simple")
      const response = await GET(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.checklists).toHaveLength(1)
      expect(data.checklists[0].type).toBe("simple")
    })

    it("should search checklists", async () => {
      const mockChecklists = [
        { id: "1", uuid: "uuid-1", title: "Shopping List", category: "Work", type: "simple", items: [{ text: "Buy milk" }], owner: "testuser" },
        { id: "2", uuid: "uuid-2", title: "Todo List", category: "Work", type: "simple", items: [], owner: "testuser" },
      ]
      mockGetUserChecklists.mockResolvedValue({ success: true, data: mockChecklists })

      const request = createMockRequest("GET", "http://localhost:3000/api/checklists?q=Shopping")
      const response = await GET(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.checklists.length).toBeGreaterThanOrEqual(1)
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/checklists")
      const response = await GET(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("POST /api/checklists", () => {
    it("should create a checklist", async () => {
      const newChecklist = {
        id: "new-list",
        uuid: "new-uuid",
        title: "Test Checklist - API",
        category: "API Tests",
        type: "simple",
        items: [],
        owner: "testuser",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }
      mockCreateList.mockResolvedValue({ success: true, data: newChecklist })

      const request = createMockRequest("POST", "http://localhost:3000/api/checklists", {
        title: "Test Checklist - API",
        category: "API Tests",
        type: "simple",
      })
      const response = await POST(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe("Test Checklist - API")
    })

    it("should return 400 when title is missing", async () => {
      const request = createMockRequest("POST", "http://localhost:3000/api/checklists", {
        category: "API Tests",
      })
      const response = await POST(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Title is required")
    })

    it("should return 400 for invalid type", async () => {
      const request = createMockRequest("POST", "http://localhost:3000/api/checklists", {
        title: "Test",
        type: "invalid",
      })
      const response = await POST(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Type must be 'simple' or 'task'")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("POST", "http://localhost:3000/api/checklists", {
        title: "Test Checklist",
      })
      const response = await POST(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("PUT /api/checklists/:id", () => {
    it("should update a checklist", async () => {
      const existingList = {
        id: "list-1",
        uuid: "uuid-1",
        title: "Original Title",
        category: "API Tests",
        type: "simple",
        items: [],
        owner: "testuser",
      }
      const updatedList = {
        ...existingList,
        title: "Updated Test Checklist - API",
        category: "API Tests Updated",
      }

      mockGetListById.mockResolvedValue(existingList)
      mockUpdateList.mockResolvedValue({ success: true, data: updatedList })

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1", {
        title: "Updated Test Checklist - API",
        category: "API Tests Updated",
      })
      const response = await PUT(request, { params: { listId: "uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe("Updated Test Checklist - API")
    })

    it("should return 404 for non-existent checklist", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/nonexistent", {
        title: "Updated Title",
      })
      const response = await PUT(request, { params: { listId: "nonexistent" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Checklist not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1", {
        title: "Updated Title",
      })
      const response = await PUT(request, { params: { listId: "uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("DELETE /api/checklists/:id", () => {
    it("should delete a checklist", async () => {
      const existingList = {
        id: "list-1",
        uuid: "uuid-1",
        title: "List to delete",
        category: "API Tests",
        type: "simple",
        items: [],
        owner: "testuser",
      }

      mockGetListById.mockResolvedValue(existingList)
      mockDeleteList.mockResolvedValue({ success: true })

      const request = createMockRequest("DELETE", "http://localhost:3000/api/checklists/uuid-1")
      const response = await DELETE(request, { params: { listId: "uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 404 for non-existent checklist", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/checklists/nonexistent")
      const response = await DELETE(request, { params: { listId: "nonexistent" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Checklist not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/checklists/uuid-1")
      const response = await DELETE(request, { params: { listId: "uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })
})
