import { describe, it, expect, beforeEach } from "vitest"
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetUserNotes,
  mockGetUserChecklists,
  mockGetListById,
  mockAddItem,
  mockGraftItem,
  mockCanReach,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup"

import { GET as LIST_NOTES } from "@/app/api/notes/route"
import { GET as LIST_CHECKLISTS } from "@/app/api/checklists/route"
import { GET as GET_CHECKLIST } from "@/app/api/checklists/[listId]/route"
import { POST as CREATE_ITEM } from "@/app/api/checklists/[listId]/items/route"

const LIST_UUID = "7b1d2c3e-4f50-4a6b-8c7d-9e0f1a2b3c4d"

const notes = Array.from({ length: 5 }, (_, n) => ({
  id: `note-${n}`,
  uuid: `uuid-${n}`,
  title: `Note ${n}`,
  category: "Work",
  owner: mockUser.username,
  content: `# Heading ${n}\n\nBody of note ${n}`,
}))

type Row = { id: string; text: string; completed: boolean; children?: Row[] }

const list = (items: Row[] = [{ id: "a", text: "milk", completed: true }, { id: "b", text: "bread", completed: false }]) => ({
  id: "groceries",
  uuid: LIST_UUID,
  title: "Groceries",
  category: "Home",
  type: "simple",
  owner: mockUser.username,
  items,
})

const listParams = () => ({ params: Promise.resolve({ listId: LIST_UUID }) })

describe("List views and paging", () => {
  beforeEach(() => {
    resetApiMocks()
    mockAuthenticateApiKey.mockResolvedValue(mockUser)
    mockCanReach.mockResolvedValue(true)
  })

  describe("GET /api/notes", () => {
    it("keeps returning full content by default", async () => {
      mockGetUserNotes.mockResolvedValue({ success: true, data: notes })

      const data = await getResponseJson(await LIST_NOTES(createMockRequest("GET", "http://localhost:3000/api/notes")))

      expect(data.notes).toHaveLength(5)
      expect(data.notes[0].content).toBe(notes[0].content)
      expect(data.total).toBe(5)
    })

    it("returns titles and excerpts in the summary view", async () => {
      mockGetUserNotes.mockResolvedValue({ success: true, data: notes })

      const data = await getResponseJson(
        await LIST_NOTES(createMockRequest("GET", "http://localhost:3000/api/notes?view=summary")),
      )

      expect(data.notes[0]).not.toHaveProperty("content")
      expect(data.notes[0].excerpt).toBe("Heading 0 Body of note 0")
    })

    it("pages with limit and offset and reports the total", async () => {
      mockGetUserNotes.mockResolvedValue({ success: true, data: notes })

      const data = await getResponseJson(
        await LIST_NOTES(createMockRequest("GET", "http://localhost:3000/api/notes?limit=2&offset=1")),
      )

      expect(data.notes.map((note: { id: string }) => note.id)).toEqual(["uuid-1", "uuid-2"])
      expect(data.total).toBe(5)
    })

    it("refuses a limit below 1", async () => {
      mockGetUserNotes.mockResolvedValue({ success: true, data: notes })

      const response = await LIST_NOTES(createMockRequest("GET", "http://localhost:3000/api/notes?limit=0"))

      expect(response.status).toBe(400)
    })
  })

  describe("GET /api/checklists", () => {
    it("returns counts instead of items in the summary view", async () => {
      mockGetUserChecklists.mockResolvedValue({ success: true, data: [list()] })

      const data = await getResponseJson(
        await LIST_CHECKLISTS(createMockRequest("GET", "http://localhost:3000/api/checklists?view=summary")),
      )

      expect(data.checklists[0]).not.toHaveProperty("items")
      expect(data.checklists[0].itemCount).toBe(2)
      expect(data.checklists[0].completedCount).toBe(1)
      expect(data.total).toBe(1)
    })
  })

  describe("GET /api/checklists/:listId", () => {
    it("returns one checklist with indexed items", async () => {
      mockGetListById.mockResolvedValue(list())

      const response = await GET_CHECKLIST(
        createMockRequest("GET", `http://localhost:3000/api/checklists/${LIST_UUID}`),
        listParams(),
      )
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.data.id).toBe(LIST_UUID)
      expect(data.data.items.map((item: { index: number }) => item.index)).toEqual([0, 1])
    })

    it("answers 404 for a list the key owner can't see", async () => {
      mockGetListById.mockResolvedValue(undefined)

      const response = await GET_CHECKLIST(
        createMockRequest("GET", `http://localhost:3000/api/checklists/${LIST_UUID}`),
        listParams(),
      )

      expect(response.status).toBe(404)
    })
  })

  describe("POST /api/checklists/:listId/items", () => {
    it("returns the index the new item landed on", async () => {
      mockGetListById
        .mockResolvedValueOnce(list())
        .mockResolvedValueOnce(list([{ id: "new", text: "eggs", completed: false }, ...list().items]))
      mockAddItem.mockResolvedValue({ success: true, data: { id: "new" } })

      const data = await getResponseJson(
        await CREATE_ITEM(
          createMockRequest("POST", `http://localhost:3000/api/checklists/${LIST_UUID}/items`, { text: "eggs" }),
          listParams(),
        ),
      )

      expect(data.data).toEqual({ id: "new", index: "0" })
    })

    it("returns the id and index of a new sub-item", async () => {
      mockGetListById.mockResolvedValue(list())
      mockGraftItem.mockResolvedValue({
        success: true,
        data: list([
          { id: "a", text: "milk", completed: true },
          { id: "b", text: "bread", completed: false, children: [{ id: "b-sub", text: "sourdough", completed: false }] },
        ]),
      })

      const data = await getResponseJson(
        await CREATE_ITEM(
          createMockRequest("POST", `http://localhost:3000/api/checklists/${LIST_UUID}/items`, {
            text: "sourdough",
            parentIndex: "1",
          }),
          listParams(),
        ),
      )

      expect(data.data).toEqual({ id: "b-sub", index: "1.0" })
    })

    it("answers 400 for a status the board doesn't have", async () => {
      mockGetListById.mockResolvedValue(list())
      mockAddItem.mockResolvedValue({ success: false, error: "Status not found on this board" })

      const response = await CREATE_ITEM(
        createMockRequest("POST", `http://localhost:3000/api/checklists/${LIST_UUID}/items`, { text: "x", status: "done" }),
        listParams(),
      )

      expect(response.status).toBe(400)
    })
  })
})
