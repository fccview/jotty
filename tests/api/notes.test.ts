import { describe, it, expect, beforeEach } from "vitest"
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetUserNotes,
  mockCreateNote,
  mockUpdateNote,
  mockDeleteNote,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup"

import { GET, POST } from "@/app/api/notes/route"
import { PUT, DELETE } from "@/app/api/notes/[noteId]/route"

describe("Notes API", () => {
  beforeEach(() => {
    resetApiMocks()
    mockAuthenticateApiKey.mockResolvedValue(mockUser)
  })

  describe("GET /api/notes", () => {
    it("should return notes array", async () => {
      const mockNotes = [
        {
          id: "note-1",
          uuid: "uuid-1",
          title: "Test Note",
          content: "Test content",
          category: "Work",
          owner: "testuser",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]
      mockGetUserNotes.mockResolvedValue({ success: true, data: mockNotes })

      const request = createMockRequest("GET", "http://localhost:3000/api/notes")
      const response = await GET(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(Array.isArray(data.notes)).toBe(true)
      expect(data.notes).toHaveLength(1)
      expect(data.notes[0].title).toBe("Test Note")
    })

    it("should filter notes by category", async () => {
      const mockNotes = [
        { id: "1", uuid: "uuid-1", title: "Work Note", category: "Work", owner: "testuser" },
        { id: "2", uuid: "uuid-2", title: "Personal Note", category: "Personal", owner: "testuser" },
      ]
      mockGetUserNotes.mockResolvedValue({ success: true, data: mockNotes })

      const request = createMockRequest("GET", "http://localhost:3000/api/notes?category=Work")
      const response = await GET(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.notes).toHaveLength(1)
      expect(data.notes[0].category).toBe("Work")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/notes")
      const response = await GET(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("POST /api/notes", () => {
    it("should create a note", async () => {
      const newNote = {
        id: "new-note",
        uuid: "new-uuid",
        title: "Test Note - API",
        content: "This is a test note created via API",
        category: "Uncategorized",
        owner: "testuser",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }
      mockCreateNote.mockResolvedValue({ success: true, data: newNote })

      const request = createMockRequest("POST", "http://localhost:3000/api/notes", {
        title: "Test Note - API",
        content: "This is a test note created via API",
        category: "Uncategorized",
      })
      const response = await POST(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe("Test Note - API")
    })

    it("should return 400 when title is missing", async () => {
      const request = createMockRequest("POST", "http://localhost:3000/api/notes", {
        content: "No title provided",
      })
      const response = await POST(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Title is required")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("POST", "http://localhost:3000/api/notes", {
        title: "Test Note",
      })
      const response = await POST(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("PUT /api/notes/:id", () => {
    it("should update a note", async () => {
      const existingNote = {
        id: "note-1",
        uuid: "uuid-1",
        title: "Original Title",
        content: "Original content",
        category: "Uncategorized",
        owner: "testuser",
      }
      const updatedNote = {
        ...existingNote,
        title: "Updated Test Note - API",
        content: "This note has been updated via API",
        category: "Work",
      }

      mockGetUserNotes.mockResolvedValue({ success: true, data: [existingNote] })
      mockUpdateNote.mockResolvedValue({ success: true, data: updatedNote })

      const request = createMockRequest("PUT", "http://localhost:3000/api/notes/uuid-1", {
        title: "Updated Test Note - API",
        content: "This note has been updated via API",
        category: "Work",
      })
      const response = await PUT(request, { params: { noteId: "uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe("Updated Test Note - API")
    })

    it("should handle partial updates", async () => {
      const existingNote = {
        id: "note-1",
        uuid: "uuid-1",
        title: "Original Title",
        content: "Original content",
        category: "Work",
        owner: "testuser",
      }
      const updatedNote = {
        ...existingNote,
        content: "Updated content only",
      }

      mockGetUserNotes.mockResolvedValue({ success: true, data: [existingNote] })
      mockUpdateNote.mockResolvedValue({ success: true, data: updatedNote })

      const request = createMockRequest("PUT", "http://localhost:3000/api/notes/uuid-1", {
        content: "Updated content only",
      })
      const response = await PUT(request, { params: { noteId: "uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 404 for non-existent note", async () => {
      mockGetUserNotes.mockResolvedValue({ success: true, data: [] })

      const request = createMockRequest("PUT", "http://localhost:3000/api/notes/nonexistent", {
        title: "Updated Title",
      })
      const response = await PUT(request, { params: { noteId: "nonexistent" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Note not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/notes/uuid-1", {
        title: "Updated Title",
      })
      const response = await PUT(request, { params: { noteId: "uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("DELETE /api/notes/:id", () => {
    it("should delete a note", async () => {
      const existingNote = {
        id: "note-1",
        uuid: "uuid-1",
        title: "Note to delete",
        content: "Content",
        category: "Uncategorized",
        owner: "testuser",
      }

      mockGetUserNotes.mockResolvedValue({ success: true, data: [existingNote] })
      mockDeleteNote.mockResolvedValue({ success: true })

      const request = createMockRequest("DELETE", "http://localhost:3000/api/notes/uuid-1")
      const response = await DELETE(request, { params: { noteId: "uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 404 for non-existent note", async () => {
      mockGetUserNotes.mockResolvedValue({ success: true, data: [] })

      const request = createMockRequest("DELETE", "http://localhost:3000/api/notes/nonexistent")
      const response = await DELETE(request, { params: { noteId: "nonexistent" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Note not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/notes/uuid-1")
      const response = await DELETE(request, { params: { noteId: "uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })
})
