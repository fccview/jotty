import { describe, it, expect, beforeEach } from "vitest"
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetListById,
  mockCanReach,
  mockEditItem,
  mockStampStatus,
  resetApiMocks,
  createMockRequest,
} from "./setup"
import { PermissionTypes } from "@/app/_types/enums"
import { PUT as CHECK } from "@/app/api/checklists/[listId]/items/[itemIndex]/check/route"
import { PUT as UNCHECK } from "@/app/api/checklists/[listId]/items/[itemIndex]/uncheck/route"
import { PATCH } from "@/app/api/checklists/[listId]/items/[itemIndex]/route"
import { PUT as MOVE_STATUS } from "@/app/api/tasks/[taskId]/items/[itemIndex]/status/route"

const list = {
  uuid: "uuid-1",
  title: "Shopping",
  type: "task",
  owner: "someoneelse",
  items: [{ id: "item-1", text: "Milk", completed: false, order: 0 }],
}

const listParams = { params: Promise.resolve({ listId: "uuid-1", itemIndex: "0" }) }
const taskParams = { params: Promise.resolve({ taskId: "uuid-1", itemIndex: "0" }) }
const url = "http://localhost:3000/api/checklists/uuid-1/items/0"

describe("read-only collaborators", () => {
  beforeEach(() => {
    resetApiMocks()
    mockAuthenticateApiKey.mockResolvedValue(mockUser)
    mockGetListById.mockResolvedValue(list)
    mockCanReach.mockImplementation(async (_uuid: string, _type: string, _user: string, permission: PermissionTypes) =>
      permission === PermissionTypes.READ,
    )
  })

  it.each([
    ["check", () => CHECK(createMockRequest("PUT", `${url}/check`), listParams)],
    ["uncheck", () => UNCHECK(createMockRequest("PUT", `${url}/uncheck`), listParams)],
    ["update", () => PATCH(createMockRequest("PATCH", url, { text: "Oat milk" }), listParams)],
  ])("get 403 on %s and nothing is written", async (_label, call) => {
    const response = await call()
    expect(response.status).toBe(403)
    expect(mockEditItem).not.toHaveBeenCalled()
  })

  it("get 403 moving a task item and nothing is written", async () => {
    const response = await MOVE_STATUS(
      createMockRequest("PUT", "http://localhost:3000/api/tasks/uuid-1/items/0/status", { status: "completed" }),
      taskParams,
    )
    expect(response.status).toBe(403)
    expect(mockStampStatus).not.toHaveBeenCalled()
  })
})
