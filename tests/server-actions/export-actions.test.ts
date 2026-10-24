import { describe, it, expect, beforeEach, vi } from "vitest"

const { mockGetCurrentUser, mockCanAccessAllContent, build } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockCanAccessAllContent: vi.fn(),
  build: {
    buildAllContent: vi.fn(),
    buildAllUsers: vi.fn(),
    buildWholeData: vi.fn(),
    buildUserContent: vi.fn(),
    readExportProgress: vi.fn(),
  },
}))

vi.mock("@/app/_server/actions/users", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  canAccessAllContent: () => mockCanAccessAllContent(),
}))

vi.mock("@/app/_server/actions/export/builders", () => build)

import {
  exportAllChecklistsNotes,
  exportAllUsersData,
  exportUserChecklistsNotes,
  exportWholeDataFolder,
} from "@/app/_server/actions/export"

const DONE = { success: true, downloadUrl: "/api/exports/x.zip" }

describe("export server actions used by the admin page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.values(build).forEach((fn) => fn.mockResolvedValue(DONE))
    mockGetCurrentUser.mockResolvedValue({ username: "admin", isAdmin: true })
  })

  it.each([
    ["all content", exportAllChecklistsNotes, build.buildAllContent],
    ["all users", exportAllUsersData, build.buildAllUsers],
    ["whole data folder", exportWholeDataFolder, build.buildWholeData],
  ])("still run the %s export for an admin with content access", async (_label, action, builder) => {
    mockCanAccessAllContent.mockResolvedValue(true)
    expect(await action()).toEqual(DONE)
    expect(builder).toHaveBeenCalled()
  })

  it.each([
    ["all content", exportAllChecklistsNotes, build.buildAllContent],
    ["all users", exportAllUsersData, build.buildAllUsers],
    ["whole data folder", exportWholeDataFolder, build.buildWholeData],
  ])("refuse the %s export without content access", async (_label, action, builder) => {
    mockCanAccessAllContent.mockResolvedValue(false)
    expect((await action()).success).toBe(false)
    expect(builder).not.toHaveBeenCalled()
  })

  it("lets anybody logged in export their own data", async () => {
    mockGetCurrentUser.mockResolvedValue({ username: "alice", isAdmin: false })
    mockCanAccessAllContent.mockResolvedValue(false)
    expect(await exportUserChecklistsNotes("alice")).toEqual(DONE)
    expect(build.buildUserContent).toHaveBeenCalledWith("alice")
  })

  it("refuses somebody else's data without content access", async () => {
    mockGetCurrentUser.mockResolvedValue({ username: "alice", isAdmin: false })
    mockCanAccessAllContent.mockResolvedValue(false)
    expect((await exportUserChecklistsNotes("bob")).success).toBe(false)
    expect(build.buildUserContent).not.toHaveBeenCalled()
  })

  it("refuses when nobody is logged in", async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    expect((await exportUserChecklistsNotes("alice")).success).toBe(false)
    expect(build.buildUserContent).not.toHaveBeenCalled()
  })
})
