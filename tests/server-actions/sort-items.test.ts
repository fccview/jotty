import { describe, it, expect, beforeEach, vi } from "vitest"

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getListById: vi.fn(),
    canReach: vi.fn(),
    reachableFile: vi.fn(),
    diskPath: vi.fn(),
    ensureDir: vi.fn(),
    serverWriteFile: vi.fn(),
    broadcast: vi.fn(),
    sessionActor: vi.fn(),
  },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/app/_server/actions/checklist/queries", () => ({ getListById: mocks.getListById }))
vi.mock("@/app/_server/actions/share/queries", () => ({ canReach: mocks.canReach, reachableFile: mocks.reachableFile }))
vi.mock("@/app/_server/actions/share/target", () => ({ diskPath: mocks.diskPath }))
vi.mock("@/app/_server/actions/file", () => ({ ensureDir: mocks.ensureDir, serverWriteFile: mocks.serverWriteFile }))
vi.mock("@/app/_server/actions/ws/broadcast", () => ({ broadcast: mocks.broadcast }))
vi.mock("@/app/_server/actions/lib/actor", () => ({ sessionActor: mocks.sessionActor }))
vi.mock("@/app/_server/actions/lib/read-only-message", () => ({
  failedWith: async (_error: unknown, fallback: string) => fallback,
}))
vi.mock("@/app/_utils/checklist-utils", () => ({ listToMarkdown: (list: unknown) => list }))

import { Sorted, restoreListOrder, sortListItems } from "@/app/_server/actions/checklist-item/sorter"
import { sortItems, undoSort } from "@/app/_server/actions/checklist-item/sort"
import { ItemSort, ItemTypes, Modes, PermissionTypes, SortDirection } from "@/app/_types/enums"
import { SanitisedUser } from "@/app/_types"

const OWN_FILE = "/tmp/jotty-test/alice/groceries.md"
const alice = { username: "alice", isAdmin: false } as SanitisedUser
const mallory = { username: "mallory", isAdmin: false } as SanitisedUser

const START = ["c", "a", "a2", "a1", "b"]

const START_SHAPE = ["0:c", "0:a", "1:a2", "1:a1", "0:b"]

const list = (type = "simple") => ({
  uuid: "list-1",
  id: "groceries",
  owner: "alice",
  category: "Uncategorized",
  type,
  items: [
    { id: "c", text: "cherry", completed: false, order: 0 },
    {
      id: "a",
      text: "Apple",
      completed: true,
      order: 1,
      children: [
        { id: "a2", text: "zest", completed: true, order: 0 },
        { id: "a1", text: "core", completed: true, order: 1 },
      ],
    },
    { id: "b", text: "banana", completed: false, order: 2 },
  ],
})

type Row = { id: string; order: number; children?: Row[] }

const written = (): Row[] => mocks.serverWriteFile.mock.calls[0][1].items

const form = (fields: Record<string, string>) => {
  const data = new FormData()
  Object.entries(fields).forEach(([key, value]) => data.append(key, value))
  return data
}

const ready = () => {
  vi.clearAllMocks()
  mocks.getListById.mockResolvedValue(list())
  mocks.canReach.mockResolvedValue(true)
  mocks.diskPath.mockResolvedValue(OWN_FILE)
  mocks.serverWriteFile.mockResolvedValue(undefined)
  mocks.sessionActor.mockResolvedValue(alice)
}

describe("sortListItems", () => {
  beforeEach(ready)

  it("writes the list A to Z and hands back the order it read", async () => {
    const outcome = await sortListItems(alice, "list-1", ItemSort.ALPHABETICAL, SortDirection.ASC)

    expect(outcome).toMatchObject({ status: Sorted.SORTED, before: START })
    expect(written().map((item) => item.id)).toEqual(["a", "b", "c"])
    expect(written().map((item) => item.order)).toEqual([0, 1, 2])
  })

  it("writes to the file of the list it read, never a uuid lookup across users", async () => {
    await sortListItems(alice, "list-1", ItemSort.ALPHABETICAL)

    expect(mocks.diskPath).toHaveBeenCalledWith(Modes.CHECKLISTS, "alice", expect.objectContaining({ uuid: "list-1", owner: "alice" }))
    expect(mocks.serverWriteFile.mock.calls[0][0]).toBe(OWN_FILE)
    expect(mocks.reachableFile).not.toHaveBeenCalled()
  })

  it("writes Z to A and sorts sub-items under their parent", async () => {
    await sortListItems(alice, "list-1", ItemSort.ALPHABETICAL, SortDirection.DESC)

    expect(written().map((item) => item.id)).toEqual(["c", "b", "a"])
    expect(written()[2].children?.map((item) => item.id)).toEqual(["a2", "a1"])
  })

  it("sorts in the language of the person asking", async () => {
    mocks.getListById.mockResolvedValue({
      ...list(),
      items: [
        { id: "z", text: "żaba", completed: false, order: 0 },
        { id: "u", text: "zupa", completed: false, order: 1 },
      ],
    })

    await sortListItems({ ...alice, preferredLocale: "pl" }, "list-1", ItemSort.ALPHABETICAL)

    expect(written().map((item) => item.id)).toEqual(["u", "z"])
  })

  it("shuffles into a new order of the same items", async () => {
    await sortListItems(alice, "list-1", ItemSort.SHUFFLE)

    const order = written().map((item) => item.id)
    expect(order).not.toEqual(["c", "a", "b"])
    expect([...order].sort()).toEqual(["a", "b", "c"])
  })

  it("checks edit permission on the list and broadcasts after the write", async () => {
    await sortListItems(alice, "list-1", ItemSort.ALPHABETICAL)

    expect(mocks.canReach).toHaveBeenCalledWith("list-1", ItemTypes.CHECKLIST, "alice", PermissionTypes.EDIT)
    expect(mocks.broadcast).toHaveBeenCalledWith({ type: "checklist", action: "updated", entityId: "list-1", username: "alice" })
    expect(mocks.broadcast.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.serverWriteFile.mock.invocationCallOrder[0])
  })

  it("leaves the file alone when the list is already in that order", async () => {
    await sortListItems(alice, "list-1", ItemSort.ALPHABETICAL, SortDirection.DESC)
    mocks.getListById.mockResolvedValue({ ...list(), items: written() })
    mocks.serverWriteFile.mockClear()
    mocks.broadcast.mockClear()

    const outcome = await sortListItems(alice, "list-1", ItemSort.ALPHABETICAL, SortDirection.DESC)

    expect(outcome.status).toBe(Sorted.UNCHANGED)
    expect(mocks.serverWriteFile).not.toHaveBeenCalled()
    expect(mocks.broadcast).not.toHaveBeenCalled()
  })

  it("writes nothing for a user without edit permission", async () => {
    mocks.canReach.mockResolvedValue(false)

    expect(await sortListItems(mallory, "list-1", ItemSort.SHUFFLE)).toEqual({ status: Sorted.FORBIDDEN })
    expect(mocks.serverWriteFile).not.toHaveBeenCalled()
    expect(mocks.broadcast).not.toHaveBeenCalled()
  })

  it("reports a list it can't find", async () => {
    mocks.getListById.mockResolvedValue(undefined)

    expect(await sortListItems(alice, "list-1", ItemSort.SHUFFLE)).toEqual({ status: Sorted.NO_LIST })
    expect(mocks.serverWriteFile).not.toHaveBeenCalled()
  })

  it("refuses a kanban board", async () => {
    mocks.getListById.mockResolvedValue(list("kanban"))

    expect(await sortListItems(alice, "list-1", ItemSort.ALPHABETICAL)).toEqual({ status: Sorted.KANBAN })
    expect(mocks.serverWriteFile).not.toHaveBeenCalled()
  })

  it("lets a failed write through without broadcasting", async () => {
    mocks.serverWriteFile.mockRejectedValue(new Error("disk full"))

    await expect(sortListItems(alice, "list-1", ItemSort.ALPHABETICAL)).rejects.toThrow("disk full")
    expect(mocks.broadcast).not.toHaveBeenCalled()
  })
})

describe("sortItems", () => {
  beforeEach(ready)

  it("sorts as the session user", async () => {
    const result = await sortItems(form({ uuid: "list-1", sort: ItemSort.ALPHABETICAL, direction: SortDirection.DESC }))

    expect(result).toMatchObject({ success: true, data: { before: START, changed: true } })
    expect(mocks.canReach).toHaveBeenCalledWith("list-1", ItemTypes.CHECKLIST, "alice", PermissionTypes.EDIT)
    expect(written().map((item) => item.id)).toEqual(["c", "b", "a"])
  })

  it("refuses without a session", async () => {
    mocks.sessionActor.mockResolvedValue({ error: "Not authenticated" })

    expect(await sortItems(form({ uuid: "list-1", sort: ItemSort.SHUFFLE }))).toEqual({ success: false, error: "errors.unauthorized" })
    expect(mocks.getListById).not.toHaveBeenCalled()
  })

  it("sorts A to Z when the direction is left empty", async () => {
    await sortItems(form({ uuid: "list-1", sort: ItemSort.ALPHABETICAL, direction: "" }))

    expect(written().map((item) => item.id)).toEqual(["a", "b", "c"])
  })

  it.each([
    [{ uuid: "list-1", sort: "sideways" }],
    [{ uuid: "list-1", sort: ItemSort.ALPHABETICAL, direction: "up" }],
    [{ sort: ItemSort.SHUFFLE }],
  ])("refuses %j before touching the list", async (fields) => {
    expect(await sortItems(form(fields))).toEqual({ success: false, error: "errors.invalidInput" })
    expect(mocks.getListById).not.toHaveBeenCalled()
  })

  it.each([
    [Sorted.FORBIDDEN, "errors.permissionDenied", () => mocks.canReach.mockResolvedValue(false)],
    [Sorted.NO_LIST, "checklists.checklistNotFound", () => mocks.getListById.mockResolvedValue(undefined)],
    [Sorted.KANBAN, "checklists.sortKanban", () => mocks.getListById.mockResolvedValue(list("kanban"))],
  ])("turns a %s refusal into a translated message", async (_status, key, arrange) => {
    arrange()

    expect(await sortItems(form({ uuid: "list-1", sort: ItemSort.SHUFFLE }))).toEqual({ success: false, error: key })
  })

  it("reports a failed write as a translated message", async () => {
    mocks.serverWriteFile.mockRejectedValue(new Error("disk full"))

    expect(await sortItems(form({ uuid: "list-1", sort: ItemSort.SHUFFLE }))).toEqual({ success: false, error: "checklists.sortFailed" })
  })
})

describe("restoreListOrder", () => {
  beforeEach(ready)

  it("writes the order it is given, sub-items included, and broadcasts", async () => {
    const outcome = await restoreListOrder(alice, "list-1", ["b", "a", "a1", "a2", "c"], START_SHAPE)

    expect(outcome.status).toBe(Sorted.SORTED)
    expect(written().map((item) => item.id)).toEqual(["b", "a", "c"])
    expect(written()[1].children?.map((item) => item.id)).toEqual(["a1", "a2"])
    expect(mocks.broadcast).toHaveBeenCalledWith({ type: "checklist", action: "updated", entityId: "list-1", username: "alice" })
  })

  it("refuses when the list moved on since the sort it would undo", async () => {
    expect(await restoreListOrder(alice, "list-1", ["b", "a", "a1", "a2", "c"], ["0:a", "1:a2", "1:a1", "0:b", "0:c"])).toEqual({
      status: Sorted.STALE,
    })
    expect(mocks.serverWriteFile).not.toHaveBeenCalled()
  })

  it("refuses when an item was nested or lifted out without changing the order", async () => {
    expect(await restoreListOrder(alice, "list-1", ["b", "a", "a1", "a2", "c"], ["0:c", "0:a", "1:a2", "0:a1", "0:b"])).toEqual({
      status: Sorted.STALE,
    })
    expect(mocks.serverWriteFile).not.toHaveBeenCalled()
  })

  it("writes nothing for an order that names no item on the list", async () => {
    expect((await restoreListOrder(alice, "list-1", ["ghost"], START_SHAPE)).status).toBe(Sorted.UNCHANGED)
    expect(mocks.serverWriteFile).not.toHaveBeenCalled()
  })

  it("writes nothing for a user without edit permission", async () => {
    mocks.canReach.mockResolvedValue(false)

    expect(await restoreListOrder(mallory, "list-1", ["b"], START_SHAPE)).toEqual({ status: Sorted.FORBIDDEN })
    expect(mocks.serverWriteFile).not.toHaveBeenCalled()
  })

  it("refuses a kanban board", async () => {
    mocks.getListById.mockResolvedValue(list("kanban"))

    expect(await restoreListOrder(alice, "list-1", ["b"], START_SHAPE)).toEqual({ status: Sorted.KANBAN })
    expect(mocks.serverWriteFile).not.toHaveBeenCalled()
  })
})

describe("undoSort", () => {
  beforeEach(ready)

  const undo = (before: unknown, expected: unknown = START_SHAPE) =>
    undoSort(form({ uuid: "list-1", before: JSON.stringify(before), expected: JSON.stringify(expected) }))

  it("restores the order as the session user", async () => {
    const result = await undo(["b", "c", "a", "a1", "a2"])

    expect(result.success).toBe(true)
    expect(mocks.canReach).toHaveBeenCalledWith("list-1", ItemTypes.CHECKLIST, "alice", PermissionTypes.EDIT)
    expect(written().map((item) => item.id)).toEqual(["b", "c", "a"])
  })

  it("tells the user when the list changed since the sort", async () => {
    expect(await undo(["b", "c", "a"], ["0:a", "0:b", "0:c"])).toEqual({ success: false, error: "checklists.sortStale" })
    expect(mocks.serverWriteFile).not.toHaveBeenCalled()
  })

  it("refuses without a session", async () => {
    mocks.sessionActor.mockResolvedValue({ error: "Not authenticated" })

    expect(await undo(["b"])).toEqual({ success: false, error: "errors.unauthorized" })
    expect(mocks.getListById).not.toHaveBeenCalled()
  })

  it.each([
    [{ uuid: "list-1" }],
    [{ uuid: "list-1", before: "not json", expected: JSON.stringify(START) }],
    [{ uuid: "list-1", before: "[]", expected: JSON.stringify(START) }],
    [{ uuid: "list-1", before: "{}", expected: JSON.stringify(START) }],
    [{ uuid: "list-1", before: "[0, 1]", expected: JSON.stringify(START) }],
    [{ uuid: "list-1", before: JSON.stringify(["b"]) }],
    [{ uuid: "list-1", before: JSON.stringify(["b"]), expected: JSON.stringify(START) }],
    [{ uuid: "list-1", before: JSON.stringify([...START, "ghost"]), expected: JSON.stringify(START) }],
    [{ before: JSON.stringify(["b"]), expected: JSON.stringify(START) }],
  ])("refuses %j before touching the list", async (fields) => {
    expect(await undoSort(form(fields))).toEqual({ success: false, error: "errors.invalidInput" })
    expect(mocks.getListById).not.toHaveBeenCalled()
  })
})
