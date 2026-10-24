import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetUserNotes,
  mockGetNoteById,
  mockCreateNote,
  mockMakeNote,
  mockEditNote,
  mockDropNote,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup"

const mockListTemplates = vi.hoisted(() => vi.fn())

vi.mock("@/app/_server/actions/template/reader", () => ({
  listTemplates: (...args: unknown[]) => mockListTemplates(...args),
}))

import { GET, POST } from "@/app/api/notes/route"
import { PUT, DELETE } from "@/app/api/notes/[noteId]/route"
import { GET as GET_TEMPLATES } from "@/app/api/templates/route"

const TEMPLATE_UUID = "44444444-4444-4444-8444-444444444444"

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
      mockMakeNote.mockResolvedValue({ success: true, data: newNote })

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

    it("should pass templateId through to note creation", async () => {
      mockMakeNote.mockResolvedValue({
        success: true,
        data: { uuid: "new-uuid", title: "Standup", content: "## Standup", category: "Work" },
      })

      const request = createMockRequest("POST", "http://localhost:3000/api/notes", {
        title: "Standup",
        category: "Work",
        templateId: TEMPLATE_UUID,
      })
      const response = await POST(request)
      const formData = mockMakeNote.mock.calls[0][1] as FormData

      expect(response.status).toBe(200)
      expect(formData.get("templateId")).toBe(TEMPLATE_UUID)
      expect(formData.get("rawContent")).toBe("")
    })

    it("should leave templateId off when it is not sent", async () => {
      mockMakeNote.mockResolvedValue({ success: true, data: { uuid: "new-uuid", title: "Plain" } })

      const request = createMockRequest("POST", "http://localhost:3000/api/notes", { title: "Plain" })
      await POST(request)
      const formData = mockMakeNote.mock.calls[0][1] as FormData

      expect(formData.has("templateId")).toBe(false)
    })

    it("should return 400 when the template is refused", async () => {
      mockMakeNote.mockResolvedValue({ error: "That template isn't one of yours, so nothing was created" })

      const request = createMockRequest("POST", "http://localhost:3000/api/notes", {
        title: "Stolen",
        templateId: TEMPLATE_UUID,
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
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

      mockGetNoteById.mockResolvedValue(existingNote)
      mockEditNote.mockResolvedValue({ success: true, data: updatedNote })

      const request = createMockRequest("PUT", "http://localhost:3000/api/notes/uuid-1", {
        title: "Updated Test Note - API",
        content: "This note has been updated via API",
        category: "Work",
      })
      const response = await PUT(request, { params: Promise.resolve({ noteId: "uuid-1" }) })
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

      mockGetNoteById.mockResolvedValue(existingNote)
      mockEditNote.mockResolvedValue({ success: true, data: updatedNote })

      const request = createMockRequest("PUT", "http://localhost:3000/api/notes/uuid-1", {
        content: "Updated content only",
      })
      const response = await PUT(request, { params: Promise.resolve({ noteId: "uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 404 for non-existent note", async () => {
      mockGetNoteById.mockResolvedValue(undefined)

      const request = createMockRequest("PUT", "http://localhost:3000/api/notes/nonexistent", {
        title: "Updated Title",
      })
      const response = await PUT(request, { params: Promise.resolve({ noteId: "nonexistent" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Note not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/notes/uuid-1", {
        title: "Updated Title",
      })
      const response = await PUT(request, { params: Promise.resolve({ noteId: "uuid-1" }) })
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

      mockGetNoteById.mockResolvedValue(existingNote)
      mockDropNote.mockResolvedValue({ success: true })

      const request = createMockRequest("DELETE", "http://localhost:3000/api/notes/uuid-1")
      const response = await DELETE(request, { params: Promise.resolve({ noteId: "uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 404 for non-existent note", async () => {
      mockGetNoteById.mockResolvedValue(undefined)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/notes/nonexistent")
      const response = await DELETE(request, { params: Promise.resolve({ noteId: "nonexistent" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Note not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/notes/uuid-1")
      const response = await DELETE(request, { params: Promise.resolve({ noteId: "uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("GET /api/templates", () => {
    it("should list the caller's templates as summaries", async () => {
      mockListTemplates.mockResolvedValue([
        { uuid: TEMPLATE_UUID, title: "Standup", encrypted: false, updatedAt: "2024-01-01T00:00:00.000Z" },
        { uuid: "55555555-5555-4555-8555-555555555555", title: "Sealed", encrypted: true, updatedAt: "2024-01-02T00:00:00.000Z" },
      ])

      const request = createMockRequest("GET", "http://localhost:3000/api/templates")
      const response = await GET_TEMPLATES(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(mockListTemplates).toHaveBeenCalledWith(mockUser.username)
      expect(data.templates).toEqual([
        { id: TEMPLATE_UUID, title: "Standup", updatedAt: "2024-01-01T00:00:00.000Z" },
        { id: "55555555-5555-4555-8555-555555555555", title: "Sealed", encrypted: true, updatedAt: "2024-01-02T00:00:00.000Z" },
      ])
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/templates")
      const response = await GET_TEMPLATES(request)

      expect(response.status).toBe(401)
      expect(mockListTemplates).not.toHaveBeenCalled()
    })
  })
})
