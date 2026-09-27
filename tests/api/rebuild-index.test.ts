import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  mockUser,
  mockAuthenticateApiKey,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup"

const mockRebuildOwner = vi.fn()
const mockGetUserIndex = vi.fn()

vi.mock("@/app/_server/actions/relations/indexer", () => ({
  rebuildOwnerRelations: (...args: unknown[]) => mockRebuildOwner(...args),
}))

vi.mock("@/app/_server/actions/users/helpers", () => ({
  getUserIndex: (...args: unknown[]) => mockGetUserIndex(...args),
}))

import { POST } from "@/app/api/admin/rebuild-index/route"

const URL = "http://localhost:3000/api/admin/rebuild-index"

describe("POST /api/admin/rebuild-index", () => {
  beforeEach(() => {
    resetApiMocks()
    mockRebuildOwner.mockReset().mockResolvedValue(2)
    mockGetUserIndex.mockReset().mockResolvedValue(0)
    mockAuthenticateApiKey.mockResolvedValue(mockUser)
  })

  it("rejects requests without a valid api key", async () => {
    mockAuthenticateApiKey.mockResolvedValue(null)

    const response = await POST(createMockRequest("POST", URL, {}))

    expect(response.status).toBe(401)
    expect(mockRebuildOwner).not.toHaveBeenCalled()
  })

  it("rebuilds your own index when no username is sent", async () => {
    const response = await POST(createMockRequest("POST", URL))
    const data = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockRebuildOwner).toHaveBeenCalledWith("testuser")
  })

  it("lets you name yourself without being an admin", async () => {
    const response = await POST(createMockRequest("POST", URL, { username: "testuser" }))

    expect(response.status).toBe(200)
    expect(mockRebuildOwner).toHaveBeenCalledWith("testuser")
  })

  it("refuses to rebuild somebody else's index for a non-admin", async () => {
    const response = await POST(createMockRequest("POST", URL, { username: "otheruser" }))

    expect(response.status).toBe(403)
    expect(mockRebuildOwner).not.toHaveBeenCalled()
  })

  it("lets an admin rebuild another user's index", async () => {
    mockAuthenticateApiKey.mockResolvedValue({ ...mockUser, isAdmin: true })

    const response = await POST(createMockRequest("POST", URL, { username: "otheruser" }))

    expect(response.status).toBe(200)
    expect(mockRebuildOwner).toHaveBeenCalledWith("otheruser")
  })

  it("returns 404 for a user that does not exist", async () => {
    mockAuthenticateApiKey.mockResolvedValue({ ...mockUser, isAdmin: true })
    mockGetUserIndex.mockResolvedValue(-1)

    const response = await POST(createMockRequest("POST", URL, { username: "ghost" }))

    expect(response.status).toBe(404)
    expect(mockRebuildOwner).not.toHaveBeenCalled()
  })
})
