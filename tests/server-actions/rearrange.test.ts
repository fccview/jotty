import { describe, it, expect, beforeEach, vi } from "vitest"

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getListById: vi.fn(),
    canReach: vi.fn(),
    serverWriteFile: vi.fn(),
    diskPath: vi.fn(),
  },
}))

vi.mock("@/app/_server/actions/checklist/queries", () => ({ getListById: mocks.getListById }))
vi.mock("@/app/_server/actions/share/queries", () => ({ canReach: mocks.canReach }))
vi.mock("@/app/_server/actions/share/target", () => ({ diskPath: mocks.diskPath }))
vi.mock("@/app/_server/actions/file", () => ({ serverWriteFile: mocks.serverWriteFile, ensureDir: vi.fn() }))
vi.mock("@/app/_server/actions/ws/broadcast", () => ({ broadcast: vi.fn() }))
vi.mock("@/app/_utils/checklist-utils", () => ({ listToMarkdown: (list: unknown) => list }))

import { Rearranged, rearrangeItems } from "@/app/_server/actions/checklist-item/rearrange"
import { DropPosition } from "@/app/_types/enums"

const list = () => ({
  uuid: "list-1",
  id: "groceries",
  owner: "alice",
  category: "Uncategorized",
  items: [
    { id: "a", text: "A", completed: false, order: 0 },
    { id: "b", text: "B", completed: false, order: 1, children: [{ id: "b1", text: "B1", completed: false, order: 0 }] },
    { id: "c", text: "C", completed: false, order: 2 },
  ],
})

const move = (activeItemId: string, overItemId: string, extra = {}) => ({
  listUuid: "list-1",
  activeItemId,
  overItemId,
  position: DropPosition.BEFORE,
  isDropInto: false,
  ...extra,
})

const written = () => mocks.serverWriteFile.mock.calls[0][1].items.map((item: { id: string }) => item.id)

describe("rearrangeItems", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getListById.mockResolvedValue(list())
    mocks.canReach.mockResolvedValue(true)
    mocks.diskPath.mockResolvedValue("/tmp/jotty-test/groceries.md")
  })

  it("moves an item after another and writes the new order", async () => {
    expect(await rearrangeItems("alice", move("a", "c", { position: DropPosition.AFTER }))).toBe(Rearranged.MOVED)
    expect(written()).toEqual(["b", "c", "a"])
  })

  it("treats dropping an item on itself as nothing to do", async () => {
    expect(await rearrangeItems("alice", move("a", "a"))).toBe(Rearranged.UNCHANGED)
    expect(mocks.serverWriteFile).not.toHaveBeenCalled()
  })

  it("refuses to drop a parent into its own child", async () => {
    expect(await rearrangeItems("alice", move("b", "b1", { isDropInto: true }))).toBe(Rearranged.UNCHANGED)
    expect(mocks.serverWriteFile).not.toHaveBeenCalled()
  })

  it("writes nothing for a user without edit permission", async () => {
    mocks.canReach.mockResolvedValue(false)
    expect(await rearrangeItems("mallory", move("a", "c"))).toBe(Rearranged.FORBIDDEN)
    expect(mocks.serverWriteFile).not.toHaveBeenCalled()
  })

  it("reports a list the user can't see", async () => {
    mocks.getListById.mockResolvedValue(undefined)
    expect(await rearrangeItems("mallory", move("a", "c"))).toBe(Rearranged.NO_LIST)
  })

  it("reports an unknown item", async () => {
    expect(await rearrangeItems("alice", move("a", "zzz"))).toBe(Rearranged.NO_ITEM)
    expect(mocks.serverWriteFile).not.toHaveBeenCalled()
  })

  it("writes to the path the share helpers resolve, not one built by hand", async () => {
    await rearrangeItems("alice", move("a", "c"))
    expect(mocks.diskPath).toHaveBeenCalled()
    expect(mocks.serverWriteFile.mock.calls[0][0]).toBe("/tmp/jotty-test/groceries.md")
  })
})
