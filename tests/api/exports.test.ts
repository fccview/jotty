import { describe, it, expect, beforeEach } from "vitest"
import {
  mockUser,
  mockAuthenticateApiKey,
  mockExportAllChecklistsNotes,
  mockExportUserChecklistsNotes,
  mockExportAllUsersData,
  mockExportWholeDataFolder,
  mockGetExportProgress,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup"

import { GET, POST } from "@/app/api/exports/route"

describe("Exports API", () => {
  beforeEach(() => {
    resetApiMocks()
    mockAuthenticateApiKey.mockResolvedValue(mockUser)
  })

  describe("POST /api/exports (all_checklists_notes)", () => {
    it("should export all checklists and notes", async () => {
      mockExportAllChecklistsNotes.mockResolvedValue({
        success: true,
        downloadUrl: "/api/exports/all_checklists_notes_123.zip",
      })

      const request = createMockRequest("POST", "http://localhost:3000/api/exports", {
        type: "all_checklists_notes",
      })
      const response = await POST(request, { params: { filename: "" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.downloadUrl).toBeDefined()
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("POST", "http://localhost:3000/api/exports", {
        type: "all_checklists_notes",
      })
      const response = await POST(request, { params: { filename: "" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("POST /api/exports (user_checklists_notes)", () => {
    it("should export user checklists and notes", async () => {
      mockExportUserChecklistsNotes.mockResolvedValue({
        success: true,
        downloadUrl: "/api/exports/user_checklists_notes_123.zip",
      })

      const request = createMockRequest("POST", "http://localhost:3000/api/exports", {
        type: "user_checklists_notes",
        username: "testuser",
      })
      const response = await POST(request, { params: { filename: "" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.downloadUrl).toBeDefined()
    })

    it("should return 400 when username is missing", async () => {
      const request = createMockRequest("POST", "http://localhost:3000/api/exports", {
        type: "user_checklists_notes",
      })
      const response = await POST(request, { params: { filename: "" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Username is required for user export")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("POST", "http://localhost:3000/api/exports", {
        type: "user_checklists_notes",
        username: "testuser",
      })
      const response = await POST(request, { params: { filename: "" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("POST /api/exports (all_users_data)", () => {
    it("should export all users data", async () => {
      mockExportAllUsersData.mockResolvedValue({
        success: true,
        downloadUrl: "/api/exports/all_users_data_123.zip",
      })

      const request = createMockRequest("POST", "http://localhost:3000/api/exports", {
        type: "all_users_data",
      })
      const response = await POST(request, { params: { filename: "" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.downloadUrl).toBeDefined()
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("POST", "http://localhost:3000/api/exports", {
        type: "all_users_data",
      })
      const response = await POST(request, { params: { filename: "" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("POST /api/exports (whole_data_folder)", () => {
    it("should export whole data folder", async () => {
      mockExportWholeDataFolder.mockResolvedValue({
        success: true,
        downloadUrl: "/api/exports/whole_data_folder_123.zip",
      })

      const request = createMockRequest("POST", "http://localhost:3000/api/exports", {
        type: "whole_data_folder",
      })
      const response = await POST(request, { params: { filename: "" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.downloadUrl).toBeDefined()
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("POST", "http://localhost:3000/api/exports", {
        type: "whole_data_folder",
      })
      const response = await POST(request, { params: { filename: "" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("POST /api/exports (validation)", () => {
    it("should return 400 when type is missing", async () => {
      const request = createMockRequest("POST", "http://localhost:3000/api/exports", {})
      const response = await POST(request, { params: { filename: "" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Export type is required")
    })

    it("should return 400 for invalid export type", async () => {
      const request = createMockRequest("POST", "http://localhost:3000/api/exports", {
        type: "invalid_type",
      })
      const response = await POST(request, { params: { filename: "" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid export type")
    })
  })

  describe("POST /api/exports (error handling)", () => {
    it("should handle export failures", async () => {
      mockExportAllChecklistsNotes.mockResolvedValue({
        success: false,
        error: "Export failed",
      })

      const request = createMockRequest("POST", "http://localhost:3000/api/exports", {
        type: "all_checklists_notes",
      })
      const response = await POST(request, { params: { filename: "" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(500)
      expect(data.error).toBe("Export failed")
    })
  })

  describe("GET /api/exports (progress)", () => {
    it("should return export progress", async () => {
      mockGetExportProgress.mockResolvedValue({
        progress: 50,
        message: "Processing files...",
      })

      const request = createMockRequest("GET", "http://localhost:3000/api/exports")
      const response = await GET(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(typeof data.progress).toBe("number")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/exports")
      const response = await GET(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })
})
