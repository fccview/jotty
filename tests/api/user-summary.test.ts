import { describe, it, expect, beforeEach } from "vitest"
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetUserNotes,
  mockGetUserChecklists,
  mockGetCategories,
  mockIsAdmin,
  mockGetUserByUsername,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup"

import { GET as GET_USER } from "@/app/api/user/[username]/route"
import { GET as GET_SUMMARY } from "@/app/api/summary/route"
import { GET as GET_CATEGORIES } from "@/app/api/categories/route"

describe("User & Summary API", () => {
  beforeEach(() => {
    resetApiMocks()
    mockAuthenticateApiKey.mockResolvedValue(mockUser)
  })

  describe("GET /api/user/:username", () => {
    it("should return user info for own profile", async () => {
      const mockUserData = {
        username: "testuser",
        email: "test@example.com",
        isAdmin: false,
        preferredTheme: "system",
        avatarUrl: null,
        passwordHash: "hash",
        apiKey: "key",
      }
      mockGetUserByUsername.mockResolvedValue(mockUserData)

      const request = createMockRequest("GET", "http://localhost:3000/api/user/testuser")
      const response = await GET_USER(request, { params: { username: "testuser" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.user.username).toBe("testuser")
      expect(data.user.passwordHash).toBeUndefined()
      expect(data.user.apiKey).toBeUndefined()
    })

    it("should return limited info for other users", async () => {
      const mockOtherUser = {
        username: "otheruser",
        email: "other@example.com",
        isAdmin: false,
        preferredTheme: "dark",
        avatarUrl: "/avatar.png",
        passwordHash: "hash",
        apiKey: "key",
      }
      mockGetUserByUsername.mockResolvedValue(mockOtherUser)

      const request = createMockRequest("GET", "http://localhost:3000/api/user/otheruser")
      const response = await GET_USER(request, { params: { username: "otheruser" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.user.username).toBe("otheruser")
      expect(data.user.email).toBeUndefined()
      expect(data.user.passwordHash).toBeUndefined()
    })

    it("should return full info for admin viewing other users", async () => {
      const adminUser = { ...mockUser, isAdmin: true }
      mockAuthenticateApiKey.mockResolvedValue(adminUser)

      const mockOtherUser = {
        username: "otheruser",
        email: "other@example.com",
        isAdmin: false,
        preferredTheme: "dark",
        avatarUrl: "/avatar.png",
        passwordHash: "hash",
        apiKey: "key",
      }
      mockGetUserByUsername.mockResolvedValue(mockOtherUser)

      const request = createMockRequest("GET", "http://localhost:3000/api/user/otheruser")
      const response = await GET_USER(request, { params: { username: "otheruser" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe("other@example.com")
      expect(data.user.passwordHash).toBeUndefined()
    })

    it("should return 404 for non-existent user", async () => {
      mockGetUserByUsername.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/user/nonexistent_user_12345")
      const response = await GET_USER(request, { params: { username: "nonexistent_user_12345" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("User not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/user/testuser")
      const response = await GET_USER(request, { params: { username: "testuser" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("GET /api/summary", () => {
    it("should return summary for current user", async () => {
      const mockNotes = [
        { id: "1", title: "Note 1", category: "Work", owner: "testuser" },
        { id: "2", title: "Note 2", category: "Personal", owner: "testuser" },
      ]
      const mockChecklists = [
        {
          id: "1",
          title: "Checklist 1",
          category: "Work",
          type: "simple",
          owner: "testuser",
          items: [
            { id: "i1", text: "Item 1", completed: true },
            { id: "i2", text: "Item 2", completed: false },
          ],
        },
        {
          id: "2",
          title: "Task 1",
          category: "Work",
          type: "task",
          owner: "testuser",
          items: [
            { id: "t1", text: "Task 1", completed: false, status: "todo" },
            { id: "t2", text: "Task 2", completed: true, status: "completed" },
          ],
        },
      ]

      mockGetUserNotes.mockResolvedValue({ success: true, data: mockNotes })
      mockGetUserChecklists.mockResolvedValue({ success: true, data: mockChecklists })

      const request = createMockRequest("GET", "http://localhost:3000/api/summary")
      const response = await GET_SUMMARY(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.summary).toBeDefined()
      expect(data.summary.username).toBe("testuser")
      expect(data.summary.notes.total).toBe(2)
      expect(data.summary.checklists.total).toBe(2)
      expect(data.summary.items.total).toBeGreaterThan(0)
    })

    it("should return summary for specific user when admin", async () => {
      const adminUser = { ...mockUser, isAdmin: true }
      mockAuthenticateApiKey.mockResolvedValue(adminUser)
      mockIsAdmin.mockResolvedValue(true)

      const mockNotes = [{ id: "1", title: "Note 1", category: "Work", owner: "otheruser" }]
      const mockChecklists = [
        {
          id: "1",
          title: "Checklist 1",
          category: "Work",
          type: "simple",
          owner: "otheruser",
          items: [],
        },
      ]

      mockGetUserNotes.mockResolvedValue({ success: true, data: mockNotes })
      mockGetUserChecklists.mockResolvedValue({ success: true, data: mockChecklists })

      const request = createMockRequest("GET", "http://localhost:3000/api/summary?username=otheruser")
      const response = await GET_SUMMARY(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.summary.username).toBe("otheruser")
    })

    it("should return 403 when non-admin queries other users", async () => {
      mockIsAdmin.mockResolvedValue(false)

      const request = createMockRequest("GET", "http://localhost:3000/api/summary?username=otheruser")
      const response = await GET_SUMMARY(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(403)
      expect(data.error).toContain("administrators")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/summary")
      const response = await GET_SUMMARY(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("GET /api/categories", () => {
    it("should return categories for notes and checklists", async () => {
      const mockNoteCategories = [
        { name: "Work", path: "Work", count: 5, level: 0 },
        { name: "Personal", path: "Personal", count: 3, level: 0 },
      ]
      const mockChecklistCategories = [
        { name: "Work", path: "Work", count: 2, level: 0 },
        { name: "Shopping", path: "Shopping", count: 1, level: 0 },
      ]

      mockGetCategories
        .mockResolvedValueOnce({ success: true, data: mockNoteCategories })
        .mockResolvedValueOnce({ success: true, data: mockChecklistCategories })

      const request = createMockRequest("GET", "http://localhost:3000/api/categories")
      const response = await GET_CATEGORIES(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.categories).toBeDefined()
      expect(data.categories.notes).toBeDefined()
      expect(data.categories.checklists).toBeDefined()
      expect(data.categories.notes.length).toBeGreaterThan(0)
      expect(data.categories.checklists.length).toBeGreaterThan(0)
    })

    it("should filter out archived categories", async () => {
      const mockNoteCategories = [
        { name: "Work", path: "Work", count: 5, level: 0 },
        { name: "_Archived", path: ".archive", count: 1, level: 0 },
      ]
      const mockChecklistCategories = [
        { name: "Work", path: "Work", count: 2, level: 0 },
      ]

      mockGetCategories
        .mockResolvedValueOnce({ success: true, data: mockNoteCategories })
        .mockResolvedValueOnce({ success: true, data: mockChecklistCategories })

      const request = createMockRequest("GET", "http://localhost:3000/api/categories")
      const response = await GET_CATEGORIES(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.categories.notes.some((c: any) => c.path.includes(".archive"))).toBe(false)
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/categories")
      const response = await GET_CATEGORIES(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })
})
