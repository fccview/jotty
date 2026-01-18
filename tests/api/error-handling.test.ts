import { describe, it, expect, beforeEach } from "vitest"
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetUserChecklists,
  mockGetListById,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup"

import { GET as GET_CHECKLISTS, POST as POST_CHECKLIST } from "@/app/api/checklists/route"
import { PUT as CHECK_ITEM } from "@/app/api/checklists/[listId]/items/[itemIndex]/check/route"
import { POST as POST_NOTE } from "@/app/api/notes/route"
import { POST as POST_ITEM } from "@/app/api/checklists/[listId]/items/route"

describe("Error Handling", () => {
  beforeEach(() => {
    resetApiMocks()
    mockAuthenticateApiKey.mockResolvedValue(mockUser)
  })

  describe("Authentication Errors", () => {
    it("should return 401 for invalid API key", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/checklists", null, {
        "x-api-key": "invalid",
      })
      const response = await GET_CHECKLISTS(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })

    it("should return 401 for missing API key", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/checklists", null, {
        "x-api-key": "",
      })
      const response = await GET_CHECKLISTS(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("Validation Errors", () => {
    it("should return 400 for missing note title", async () => {
      const request = createMockRequest("POST", "http://localhost:3000/api/notes", {
        content: "No title provided",
      })
      const response = await POST_NOTE(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Title is required")
    })

    it("should return 400 for missing item text", async () => {
      const mockList = {
        id: "list-1",
        uuid: "uuid-1",
        title: "Test List",
        category: "Work",
        type: "simple",
        owner: "testuser",
        items: [],
      }
      mockGetListById.mockResolvedValue(mockList)

      const request = createMockRequest("POST", "http://localhost:3000/api/checklists/uuid-1/items", {})
      const response = await POST_ITEM(request, { params: { listId: "uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Text is required")
    })

    it("should return 400 for missing checklist title", async () => {
      const request = createMockRequest("POST", "http://localhost:3000/api/checklists", {
        category: "API Tests",
      })
      const response = await POST_CHECKLIST(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Title is required")
    })

    it("should return 400 for invalid checklist type", async () => {
      const request = createMockRequest("POST", "http://localhost:3000/api/checklists", {
        title: "Test",
        type: "invalid",
      })
      const response = await POST_CHECKLIST(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Type must be 'simple' or 'task'")
    })
  })

  describe("Not Found Errors", () => {
    it("should return 404 for non-existent list", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/nonexistent/items/0/check")
      const response = await CHECK_ITEM(request, { params: { listId: "nonexistent", itemIndex: "0" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("List not found")
    })
  })

  describe("Range Errors", () => {
    it("should return 400 for item index out of range", async () => {
      const mockList = {
        id: "list-1",
        uuid: "uuid-1",
        title: "Test List",
        category: "Work",
        type: "simple",
        owner: "testuser",
        items: [
          { id: "item-1", text: "Item 1", completed: false },
        ],
      }
      mockGetListById.mockResolvedValue(mockList)

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1/items/999/check")
      const response = await CHECK_ITEM(request, { params: { listId: "uuid-1", itemIndex: "999" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Item index out of range")
    })

    it("should return 400 for invalid item index format", async () => {
      const mockList = {
        id: "list-1",
        uuid: "uuid-1",
        title: "Test List",
        category: "Work",
        type: "simple",
        owner: "testuser",
        items: [
          { id: "item-1", text: "Item 1", completed: false },
        ],
      }
      mockGetListById.mockResolvedValue(mockList)

      const request = createMockRequest("PUT", "http://localhost:3000/api/checklists/uuid-1/items/-1/check")
      const response = await CHECK_ITEM(request, { params: { listId: "uuid-1", itemIndex: "-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid item index")
    })
  })

  describe("Server Errors", () => {
    it("should return 500 for internal server errors", async () => {
      mockGetUserChecklists.mockResolvedValue({ success: false, error: "Database error" })

      const request = createMockRequest("GET", "http://localhost:3000/api/checklists")
      const response = await GET_CHECKLISTS(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })
})
