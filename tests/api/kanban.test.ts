import { describe, it, expect, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetUserChecklists,
  mockMakeList,
  mockEditList,
  mockDropList,
  mockGetListById,
  mockAddItem,
  mockEditItem,
  mockRemoveItem,
  mockStampStatus,
  mockRestatus,
  mockAssignItem,
  mockRemindItem,
  mockResolveApiId,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup"

import { GET as LIST_BOARDS, POST as CREATE_BOARD } from "@/app/api/kanban/route"
import { GET as GET_BOARD, PUT as UPDATE_BOARD, DELETE as DELETE_BOARD } from "@/app/api/kanban/[boardId]/route"
import { PUT as SET_STATUSES } from "@/app/api/kanban/[boardId]/statuses/route"
import { GET as GET_CALENDAR } from "@/app/api/kanban/[boardId]/calendar/route"
import { POST as CREATE_CARD } from "@/app/api/kanban/[boardId]/items/route"
import { PUT as UPDATE_CARD, DELETE as DELETE_CARD } from "@/app/api/kanban/[boardId]/items/[itemId]/route"
import { PUT as MOVE_CARD } from "@/app/api/kanban/[boardId]/items/[itemId]/status/route"
import { PUT as ASSIGN_CARD } from "@/app/api/kanban/[boardId]/items/[itemId]/assign/route"
import { PUT as SET_REMINDER, DELETE as CLEAR_REMINDER } from "@/app/api/kanban/[boardId]/items/[itemId]/reminder/route"

const BOARD_UUID = "4f1c2b3a-5d6e-4f70-8a9b-0c1d2e3f4a5b"
const BASE = "http://localhost:3000/api/kanban"
const DENIED = "Permission denied"

const board = (overrides: Record<string, unknown> = {}) => ({
  id: "sprint",
  uuid: BOARD_UUID,
  title: "Sprint",
  category: "Work",
  type: "kanban",
  owner: mockUser.username,
  statuses: [
    { id: "todo", label: "To Do", order: 0 },
    { id: "done", label: "Done", order: 1, autoComplete: true },
  ],
  items: [
    {
      id: "card-1",
      text: "Write tests",
      completed: false,
      order: 0,
      status: "todo",
      priority: "high",
      targetDate: "2030-01-10",
    },
  ],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
  ...overrides,
})

const boardParams = (boardId = BOARD_UUID) => ({ params: Promise.resolve({ boardId }) })
const cardParams = (itemId = "card-1") => ({ params: Promise.resolve({ boardId: BOARD_UUID, itemId }) })

const rawRequest = (method: string, url: string, body: string) =>
  new NextRequest(new URL(url), {
    method,
    headers: { "Content-Type": "application/json", "x-api-key": "test-api-key" },
    body,
  })

describe("Kanban API", () => {
  beforeEach(() => {
    resetApiMocks()
    mockAuthenticateApiKey.mockResolvedValue(mockUser)
    mockGetListById.mockResolvedValue(board())
  })

  describe("GET /api/kanban", () => {
    it("lists only the owner's kanban boards, trimmed", async () => {
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [
          board(),
          board({ uuid: "legacy", type: "task", title: "Legacy" }),
          board({ uuid: "groceries", type: "simple" }),
          board({ uuid: "shared", owner: "someone-else" }),
        ],
      })

      const response = await LIST_BOARDS(createMockRequest("GET", BASE))
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.boards.map((b: { id: string }) => b.id)).toEqual([BOARD_UUID, "legacy"])
      expect(data.boards[0]).toEqual({
        id: BOARD_UUID,
        title: "Sprint",
        category: "Work",
        statuses: board().statuses,
        items: [
          {
            id: "card-1",
            index: 0,
            text: "Write tests",
            status: "todo",
            completed: false,
            priority: "high",
          },
        ],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
      })
    })

    it("filters by category, status and text", async () => {
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [board(), board({ uuid: "other", title: "Other", category: "Home", items: [] })],
      })

      const byStatus = await getResponseJson(await LIST_BOARDS(createMockRequest("GET", `${BASE}?status=todo`)))
      const byText = await getResponseJson(await LIST_BOARDS(createMockRequest("GET", `${BASE}?q=WRITE`)))
      const byCategory = await getResponseJson(await LIST_BOARDS(createMockRequest("GET", `${BASE}?category=Home`)))

      expect(byStatus.boards.map((b: { id: string }) => b.id)).toEqual([BOARD_UUID])
      expect(byText.boards.map((b: { id: string }) => b.id)).toEqual([BOARD_UUID])
      expect(byCategory.boards.map((b: { id: string }) => b.id)).toEqual(["other"])
    })

    it("returns 401 without a valid key", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const response = await LIST_BOARDS(createMockRequest("GET", BASE))

      expect(response.status).toBe(401)
      expect(await getResponseJson(response)).toEqual({ error: "Unauthorized" })
    })

    it("returns 500 when the lists cannot be read", async () => {
      mockGetUserChecklists.mockResolvedValue({ success: false, error: "Disk on fire" })

      const response = await LIST_BOARDS(createMockRequest("GET", BASE))

      expect(response.status).toBe(500)
      expect((await getResponseJson(response)).error).toBe("Disk on fire")
    })
  })

  describe("POST /api/kanban", () => {
    it("creates a kanban board in Uncategorized by default", async () => {
      mockMakeList.mockResolvedValue({ success: true, data: board({ category: "Uncategorized", items: [] }) })

      const response = await CREATE_BOARD(createMockRequest("POST", BASE, { title: "Sprint" }))
      const data = await getResponseJson(response)
      const formData: FormData = mockMakeList.mock.calls[0][1]

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(BOARD_UUID)
      expect(formData.get("type")).toBe("kanban")
      expect(formData.get("category")).toBe("Uncategorized")
    })

    it("hands custom columns to makeList so they are written with the board", async () => {
      const columns = [{ id: "backlog", label: "Backlog", order: 0 }]
      mockMakeList.mockResolvedValue({ success: true, data: board({ statuses: columns }) })

      const response = await CREATE_BOARD(createMockRequest("POST", BASE, { title: "Sprint", statuses: columns }))

      expect(response.status).toBe(200)
      expect(mockMakeList.mock.calls[0][2]).toEqual(columns)
    })

    it("keeps the exact message for a missing title", async () => {
      const response = await CREATE_BOARD(createMockRequest("POST", BASE, { category: "Work" }))

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe("Title is required")
      expect(mockMakeList).not.toHaveBeenCalled()
    })

    it("answers 400 to a body that is not JSON", async () => {
      const response = await CREATE_BOARD(rawRequest("POST", BASE, "{nope"))

      expect(response.status).toBe(400)
      expect(mockMakeList).not.toHaveBeenCalled()
    })

    it("passes a folder refusal through as 400", async () => {
      mockMakeList.mockResolvedValue({ error: "You can't create items here" })

      const response = await CREATE_BOARD(createMockRequest("POST", BASE, { title: "Sprint", category: "Shared" }))

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe("You can't create items here")
    })
  })

  describe("GET /api/kanban/:boardId", () => {
    it("returns the trimmed board", async () => {
      const response = await GET_BOARD(createMockRequest("GET", `${BASE}/${BOARD_UUID}`), boardParams())
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.board.id).toBe(BOARD_UUID)
      expect(data.board.items[0].index).toBe(0)
      expect(mockGetListById).toHaveBeenCalledWith(BOARD_UUID, mockUser.username)
    })

    it("returns 404 for a board the key owner cannot see", async () => {
      mockGetListById.mockResolvedValue(undefined)

      const response = await GET_BOARD(createMockRequest("GET", `${BASE}/${BOARD_UUID}`), boardParams())

      expect(response.status).toBe(404)
      expect(await getResponseJson(response)).toEqual({ error: "Board not found" })
    })

    it("returns 400 for a plain checklist", async () => {
      mockGetListById.mockResolvedValue(board({ type: "simple" }))

      const response = await GET_BOARD(createMockRequest("GET", `${BASE}/${BOARD_UUID}`), boardParams())

      expect(response.status).toBe(400)
      expect(await getResponseJson(response)).toEqual({ error: "Not a kanban board" })
    })

    it("still resolves a legacy slug through ?category=", async () => {
      mockResolveApiId.mockResolvedValue(BOARD_UUID)

      const response = await GET_BOARD(
        createMockRequest("GET", `${BASE}/sprint?category=Work`),
        boardParams("sprint"),
      )

      expect(response.status).toBe(200)
      expect(mockResolveApiId).toHaveBeenCalledWith(expect.anything(), "sprint", "Work", mockUser.username)
    })
  })

  describe("PUT /api/kanban/:boardId", () => {
    it("keeps fields that were left out", async () => {
      mockEditList.mockResolvedValue({ success: true, data: board({ title: "Renamed" }) })

      const response = await UPDATE_BOARD(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}`, { title: "Renamed" }),
        boardParams(),
      )
      const formData: FormData = mockEditList.mock.calls[0][1]

      expect(response.status).toBe(200)
      expect((await getResponseJson(response)).data.title).toBe("Renamed")
      expect(formData.get("uuid")).toBe(BOARD_UUID)
      expect(formData.get("category")).toBe("Work")
    })

    it("answers 400 when the action refuses the edit", async () => {
      mockEditList.mockResolvedValue({ error: DENIED })

      const response = await UPDATE_BOARD(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}`, { title: "Mine now" }),
        boardParams(),
      )

      expect(response.status).toBe(400)
      expect(await getResponseJson(response)).toEqual({ error: DENIED })
    })

    it("rejects a non-string title", async () => {
      const response = await UPDATE_BOARD(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}`, { title: 42 }),
        boardParams(),
      )

      expect(response.status).toBe(400)
      expect(mockEditList).not.toHaveBeenCalled()
    })
  })

  describe("DELETE /api/kanban/:boardId", () => {
    it("deletes the board", async () => {
      mockDropList.mockResolvedValue({ success: true })

      const response = await DELETE_BOARD(createMockRequest("DELETE", `${BASE}/${BOARD_UUID}`), boardParams())

      expect(response.status).toBe(200)
      expect(await getResponseJson(response)).toEqual({ success: true })
    })

    it("answers 400 when the action refuses the delete", async () => {
      mockDropList.mockResolvedValue({ error: DENIED })

      const response = await DELETE_BOARD(createMockRequest("DELETE", `${BASE}/${BOARD_UUID}`), boardParams())

      expect(response.status).toBe(400)
      expect(await getResponseJson(response)).toEqual({ error: DENIED })
    })

    it("returns 404 before asking the action for a board that cannot be seen", async () => {
      mockGetListById.mockResolvedValue(undefined)

      const response = await DELETE_BOARD(createMockRequest("DELETE", `${BASE}/${BOARD_UUID}`), boardParams())

      expect(response.status).toBe(404)
      expect(mockDropList).not.toHaveBeenCalled()
    })
  })

  describe("PUT /api/kanban/:boardId/statuses", () => {
    const statuses = [{ id: "todo", label: "To Do", order: 0 }]

    it("replaces the columns", async () => {
      const response = await SET_STATUSES(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}/statuses`, { statuses }),
        boardParams(),
      )

      expect(response.status).toBe(200)
      expect((await getResponseJson(response)).data.statuses).toEqual(statuses)
      expect(mockRestatus.mock.calls[0][1]).toBe(BOARD_UUID)
    })

    it.each([[{}], [{ statuses: "todo" }]])("keeps the exact message for %j", async (body) => {
      const response = await SET_STATUSES(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}/statuses`, body),
        boardParams(),
      )

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe("Statuses array is required")
      expect(mockRestatus).not.toHaveBeenCalled()
    })

    it("answers 400 when the action refuses", async () => {
      mockRestatus.mockResolvedValue({ success: false, error: DENIED })

      const response = await SET_STATUSES(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}/statuses`, { statuses }),
        boardParams(),
      )

      expect(response.status).toBe(400)
      expect(await getResponseJson(response)).toEqual({ error: DENIED })
    })
  })

  describe("GET /api/kanban/:boardId/calendar", () => {
    it("returns events as JSON", async () => {
      const response = await GET_CALENDAR(createMockRequest("GET", `${BASE}/${BOARD_UUID}/calendar`), boardParams())
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.events).toHaveLength(1)
      expect(data.events[0]).toMatchObject({ id: "card-1", itemId: "card-1", endDate: "2030-01-10" })
    })

    it("returns an iCalendar file when asked", async () => {
      const response = await GET_CALENDAR(
        createMockRequest("GET", `${BASE}/${BOARD_UUID}/calendar`, undefined, { Accept: "text/calendar" }),
        boardParams(),
      )

      expect(response.status).toBe(200)
      expect(response.headers.get("Content-Type")).toContain("text/calendar")
      expect(await response.text()).toContain("BEGIN:VCALENDAR")
    })

    it("returns 404 for a board the key owner cannot see", async () => {
      mockGetListById.mockResolvedValue(undefined)

      const response = await GET_CALENDAR(createMockRequest("GET", `${BASE}/${BOARD_UUID}/calendar`), boardParams())

      expect(response.status).toBe(404)
    })
  })

  describe("POST /api/kanban/:boardId/items", () => {
    it("adds a card", async () => {
      mockAddItem.mockResolvedValue({ success: true, data: { id: "card-2", text: "Ship", completed: false, order: 0 } })

      const response = await CREATE_CARD(
        createMockRequest("POST", `${BASE}/${BOARD_UUID}/items`, { text: "Ship", status: "done" }),
        boardParams(),
      )
      const formData: FormData = mockAddItem.mock.calls[0][2]

      expect(response.status).toBe(200)
      expect((await getResponseJson(response)).data.id).toBe("card-2")
      expect(formData.get("status")).toBe("done")
      expect(formData.get("description")).toBeNull()
    })

    it("keeps the exact message for missing text", async () => {
      const response = await CREATE_CARD(
        createMockRequest("POST", `${BASE}/${BOARD_UUID}/items`, { status: "todo" }),
        boardParams(),
      )

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe("Text is required")
    })

    it("answers 400 when the action refuses", async () => {
      mockAddItem.mockResolvedValue({ success: false, error: DENIED })

      const response = await CREATE_CARD(
        createMockRequest("POST", `${BASE}/${BOARD_UUID}/items`, { text: "Sneaky" }),
        boardParams(),
      )

      expect(response.status).toBe(400)
      expect(await getResponseJson(response)).toEqual({ error: DENIED })
    })
  })

  describe("PUT /api/kanban/:boardId/items/:itemId", () => {
    it("forwards only the fields that were sent", async () => {
      mockEditItem.mockResolvedValue({ success: true, data: board() })

      const response = await UPDATE_CARD(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}/items/card-1`, {
          priority: "low",
          score: 3,
          reminder: { datetime: "2030-01-01T09:00:00.000Z" },
        }),
        cardParams(),
      )
      const formData: FormData = mockEditItem.mock.calls[0][2]

      expect(response.status).toBe(200)
      expect(formData.get("itemId")).toBe("card-1")
      expect(formData.get("priority")).toBe("low")
      expect(formData.get("score")).toBe("3")
      expect(JSON.parse(formData.get("reminder") as string)).toEqual({ datetime: "2030-01-01T09:00:00.000Z" })
      expect(formData.has("text")).toBe(false)
      expect(formData.has("assignee")).toBe(false)
    })

    it("accepts a legacy task-typed board", async () => {
      mockGetListById.mockResolvedValue(board({ type: "task" }))
      mockEditItem.mockResolvedValue({ success: true, data: board() })

      const response = await UPDATE_CARD(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}/items/card-1`, { text: "Renamed" }),
        cardParams(),
      )

      expect(response.status).toBe(200)
    })

    it("rejects an unknown priority", async () => {
      const response = await UPDATE_CARD(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}/items/card-1`, { priority: "urgent-ish" }),
        cardParams(),
      )

      expect(response.status).toBe(400)
      expect(mockEditItem).not.toHaveBeenCalled()
    })

    it("answers 400 when the action refuses", async () => {
      mockEditItem.mockResolvedValue({ success: false, error: DENIED })

      const response = await UPDATE_CARD(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}/items/card-1`, { text: "Mine" }),
        cardParams(),
      )

      expect(response.status).toBe(400)
      expect(await getResponseJson(response)).toEqual({ error: DENIED })
    })
  })

  describe("DELETE /api/kanban/:boardId/items/:itemId", () => {
    it("deletes the card", async () => {
      const response = await DELETE_CARD(createMockRequest("DELETE", `${BASE}/${BOARD_UUID}/items/card-1`), cardParams())

      expect(response.status).toBe(200)
      expect(await getResponseJson(response)).toEqual({ success: true })
      expect(mockRemoveItem).toHaveBeenCalledWith(expect.anything(), BOARD_UUID, "card-1")
    })

    it("answers 400 when the action refuses", async () => {
      mockRemoveItem.mockResolvedValue({ success: false, error: DENIED })

      const response = await DELETE_CARD(createMockRequest("DELETE", `${BASE}/${BOARD_UUID}/items/card-1`), cardParams())

      expect(response.status).toBe(400)
      expect(await getResponseJson(response)).toEqual({ error: DENIED })
    })
  })

  describe("PUT /api/kanban/:boardId/items/:itemId/status", () => {
    it("moves the card", async () => {
      mockStampStatus.mockResolvedValue({ success: true, data: board() })

      const response = await MOVE_CARD(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}/items/card-1/status`, { status: "done" }),
        cardParams(),
      )
      const formData: FormData = mockStampStatus.mock.calls[0][1]

      expect(response.status).toBe(200)
      expect(formData.get("uuid")).toBe(BOARD_UUID)
      expect(formData.get("status")).toBe("done")
    })

    it("keeps the exact message for a missing status", async () => {
      const response = await MOVE_CARD(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}/items/card-1/status`, {}),
        cardParams(),
      )

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe("Status is required")
    })
  })

  describe("PUT /api/kanban/:boardId/items/:itemId/assign", () => {
    it("unassigns on a null assignee", async () => {
      mockAssignItem.mockResolvedValue({ success: true, data: board() })

      const response = await ASSIGN_CARD(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}/items/card-1/assign`, { assignee: null }),
        cardParams(),
      )

      expect(response.status).toBe(200)
      expect(mockAssignItem).toHaveBeenCalledWith(expect.anything(), BOARD_UUID, "card-1", "")
    })

    it("answers 400 when the action refuses", async () => {
      mockAssignItem.mockResolvedValue({ success: false, error: DENIED })

      const response = await ASSIGN_CARD(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}/items/card-1/assign`, { assignee: "bob" }),
        cardParams(),
      )

      expect(response.status).toBe(400)
      expect(await getResponseJson(response)).toEqual({ error: DENIED })
    })
  })

  describe("/api/kanban/:boardId/items/:itemId/reminder", () => {
    it("sets a reminder", async () => {
      mockRemindItem.mockResolvedValue({ success: true, data: board() })

      const response = await SET_REMINDER(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}/items/card-1/reminder`, { datetime: "2030-01-01T09:00:00.000Z" }),
        cardParams(),
      )

      expect(response.status).toBe(200)
      expect(mockRemindItem).toHaveBeenCalledWith(
        expect.anything(),
        BOARD_UUID,
        "card-1",
        JSON.stringify({ datetime: "2030-01-01T09:00:00.000Z" }),
      )
    })

    it("keeps the exact message for a missing datetime", async () => {
      const response = await SET_REMINDER(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}/items/card-1/reminder`, {}),
        cardParams(),
      )

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe("Datetime is required")
    })

    it("rejects a datetime that is not a date", async () => {
      const response = await SET_REMINDER(
        createMockRequest("PUT", `${BASE}/${BOARD_UUID}/items/card-1/reminder`, { datetime: "next tuesday-ish" }),
        cardParams(),
      )

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe("Datetime must be a valid date")
      expect(mockRemindItem).not.toHaveBeenCalled()
    })

    it("clears a reminder", async () => {
      mockRemindItem.mockResolvedValue({ success: true, data: board() })

      const response = await CLEAR_REMINDER(
        createMockRequest("DELETE", `${BASE}/${BOARD_UUID}/items/card-1/reminder`),
        cardParams(),
      )

      expect(response.status).toBe(200)
      expect(await getResponseJson(response)).toEqual({ success: true })
      expect(mockRemindItem).toHaveBeenCalledWith(expect.anything(), BOARD_UUID, "card-1", "")
    })
  })
})
