import { describe, it, expect, beforeEach } from "vitest"
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetUserChecklists,
  mockCreateList,
  mockUpdateList,
  mockDeleteList,
  mockGetListById,
  mockCreateItem,
  mockUpdateItemStatus,
  mockServerWriteFile,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup"

import { GET as GET_TASKS, POST as POST_TASKS } from "@/app/api/tasks/route"
import { GET as GET_TASK, PUT as PUT_TASK, DELETE as DELETE_TASK } from "@/app/api/tasks/[taskId]/route"
import { GET as GET_STATUSES, POST as POST_STATUS } from "@/app/api/tasks/[taskId]/statuses/route"
import { PUT as PUT_STATUS, DELETE as DELETE_STATUS } from "@/app/api/tasks/[taskId]/statuses/[statusId]/route"
import { POST as POST_TASK_ITEM } from "@/app/api/tasks/[taskId]/items/route"
import { DELETE as DELETE_TASK_ITEM } from "@/app/api/tasks/[taskId]/items/[itemIndex]/route"
import { PUT as PUT_ITEM_STATUS } from "@/app/api/tasks/[taskId]/items/[itemIndex]/status/route"

describe("Tasks API", () => {
  const mockTask = {
    id: "task-1",
    uuid: "task-uuid-1",
    title: "Test Task Board",
    category: "Testing",
    type: "task",
    owner: "testuser",
    statuses: [
      { id: "todo", label: "To Do", order: 0 },
      { id: "in_progress", label: "In Progress", order: 1 },
      { id: "completed", label: "Completed", order: 2 },
    ],
    items: [
      {
        id: "item-1",
        text: "Task Item 1",
        status: "todo",
        completed: false,
        children: [
          {
            id: "item-1-1",
            text: "Sub Task",
            status: "todo",
            completed: false,
          },
        ],
      },
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  }

  beforeEach(() => {
    resetApiMocks()
    mockAuthenticateApiKey.mockResolvedValue(mockUser)
    mockServerWriteFile.mockResolvedValue(undefined)
  })

  describe("GET /api/tasks", () => {
    it("should return tasks array", async () => {
      mockGetUserChecklists.mockResolvedValue({ success: true, data: [mockTask] })

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks")
      const response = await GET_TASKS(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(Array.isArray(data.tasks)).toBe(true)
      expect(data.tasks).toHaveLength(1)
      expect(data.tasks[0].title).toBe("Test Task Board")
    })

    it("should filter by category", async () => {
      const tasks = [
        { ...mockTask, category: "Work" },
        { ...mockTask, id: "task-2", uuid: "task-uuid-2", category: "Personal" },
      ]
      mockGetUserChecklists.mockResolvedValue({ success: true, data: tasks })

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks?category=Work")
      const response = await GET_TASKS(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.tasks).toHaveLength(1)
      expect(data.tasks[0].category).toBe("Work")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks")
      const response = await GET_TASKS(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("POST /api/tasks", () => {
    it("should create a task", async () => {
      const newTask = {
        ...mockTask,
        id: "new-task",
        uuid: "new-task-uuid",
        title: "API Test Task Board",
      }
      mockCreateList.mockResolvedValue({ success: true, data: newTask })

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks", {
        title: "API Test Task Board",
        category: "Testing",
      })
      const response = await POST_TASKS(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.statuses).toBeDefined()
      expect(data.data.statuses.length).toBeGreaterThanOrEqual(3)
    })

    it("should return 400 when title is missing", async () => {
      const request = createMockRequest("POST", "http://localhost:3000/api/tasks", {
        category: "Testing",
      })
      const response = await POST_TASKS(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Title is required")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks", {
        title: "Test Task",
      })
      const response = await POST_TASKS(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("GET /api/tasks/:taskId", () => {
    it("should return a task", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1")
      const response = await GET_TASK(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.task).toBeDefined()
      expect(data.task.title).toBe("Test Task Board")
    })

    it("should return 404 for non-existent task", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/nonexistent")
      const response = await GET_TASK(request, { params: { taskId: "nonexistent" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Task not found")
    })

    it("should return 400 for non-task checklist", async () => {
      mockGetListById.mockResolvedValue({ ...mockTask, type: "simple" })

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1")
      const response = await GET_TASK(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Not a task checklist")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1")
      const response = await GET_TASK(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("PUT /api/tasks/:taskId", () => {
    it("should update a task", async () => {
      const updatedTask = { ...mockTask, title: "Updated Task Board", category: "Work" }
      mockGetListById.mockResolvedValue(mockTask)
      mockUpdateList.mockResolvedValue({ success: true, data: updatedTask })

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1", {
        title: "Updated Task Board",
        category: "Work",
      })
      const response = await PUT_TASK(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe("Updated Task Board")
    })

    it("should return 404 for non-existent task", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/nonexistent", {
        title: "Updated",
      })
      const response = await PUT_TASK(request, { params: { taskId: "nonexistent" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Task not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1", {
        title: "Updated",
      })
      const response = await PUT_TASK(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("DELETE /api/tasks/:taskId", () => {
    it("should delete a task", async () => {
      mockGetListById.mockResolvedValue(mockTask)
      mockDeleteList.mockResolvedValue({ success: true })

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1")
      const response = await DELETE_TASK(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 404 for non-existent task", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/nonexistent")
      const response = await DELETE_TASK(request, { params: { taskId: "nonexistent" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Task not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1")
      const response = await DELETE_TASK(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("GET /api/tasks/:taskId/statuses", () => {
    it("should return statuses", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1/statuses")
      const response = await GET_STATUSES(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(Array.isArray(data.statuses)).toBe(true)
      expect(data.statuses.length).toBeGreaterThanOrEqual(3)
    })

    it("should return 404 for non-existent task", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/nonexistent/statuses")
      const response = await GET_STATUSES(request, { params: { taskId: "nonexistent" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Task not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1/statuses")
      const response = await GET_STATUSES(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("POST /api/tasks/:taskId/statuses", () => {
    it("should create a status", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/statuses", {
        id: "review",
        label: "In Review",
        color: "#3b82f6",
        order: 2,
      })
      const response = await POST_STATUS(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe("review")
    })

    it("should return 400 when id or label is missing", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/statuses", {
        color: "#3b82f6",
      })
      const response = await POST_STATUS(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Status id and label are required")
    })

    it("should return 400 for duplicate status id", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/statuses", {
        id: "todo",
        label: "Duplicate To Do",
      })
      const response = await POST_STATUS(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Status with this id already exists")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/statuses", {
        id: "review",
        label: "In Review",
      })
      const response = await POST_STATUS(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("PUT /api/tasks/:taskId/statuses/:statusId", () => {
    it("should update a status", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/statuses/in_progress", {
        label: "Code Review",
        color: "#8b5cf6",
      })
      const response = await PUT_STATUS(request, { params: { taskId: "task-uuid-1", statusId: "in_progress" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.label).toBe("Code Review")
    })

    it("should return 404 for non-existent status", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/statuses/nonexistent", {
        label: "Updated",
      })
      const response = await PUT_STATUS(request, { params: { taskId: "task-uuid-1", statusId: "nonexistent" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Status not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/statuses/todo", {
        label: "Updated",
      })
      const response = await PUT_STATUS(request, { params: { taskId: "task-uuid-1", statusId: "todo" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("DELETE /api/tasks/:taskId/statuses/:statusId", () => {
    it("should delete a status", async () => {
      const taskWithReview = {
        ...mockTask,
        statuses: [
          ...mockTask.statuses,
          { id: "review", label: "In Review", order: 3 },
        ],
      }
      mockGetListById.mockResolvedValue(taskWithReview)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1/statuses/review")
      const response = await DELETE_STATUS(request, { params: { taskId: "task-uuid-1", statusId: "review" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 404 for non-existent status", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1/statuses/nonexistent")
      const response = await DELETE_STATUS(request, { params: { taskId: "task-uuid-1", statusId: "nonexistent" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Status not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1/statuses/todo")
      const response = await DELETE_STATUS(request, { params: { taskId: "task-uuid-1", statusId: "todo" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("POST /api/tasks/:taskId/items", () => {
    it("should create a task item", async () => {
      mockGetListById.mockResolvedValue(mockTask)
      mockCreateItem.mockResolvedValue({ success: true, data: { id: "new-item" } })

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/items", {
        text: "Implement feature X",
        status: "todo",
      })
      const response = await POST_TASK_ITEM(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should create a nested task item", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/items", {
        text: "Sub-task: Write tests",
        status: "todo",
        parentIndex: "0",
      })
      const response = await POST_TASK_ITEM(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 400 when text is missing", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/items", {
        status: "todo",
      })
      const response = await POST_TASK_ITEM(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Text is required")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/items", {
        text: "Test",
      })
      const response = await POST_TASK_ITEM(request, { params: { taskId: "task-uuid-1" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("PUT /api/tasks/:taskId/items/:itemIndex/status", () => {
    it("should update item status", async () => {
      mockGetListById.mockResolvedValue(mockTask)
      mockUpdateItemStatus.mockResolvedValue({ success: true })

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/items/0/status", {
        status: "in_progress",
      })
      const response = await PUT_ITEM_STATUS(request, { params: { taskId: "task-uuid-1", itemIndex: "0" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should update nested item status", async () => {
      mockGetListById.mockResolvedValue(mockTask)
      mockUpdateItemStatus.mockResolvedValue({ success: true })

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/items/0.0/status", {
        status: "in_progress",
      })
      const response = await PUT_ITEM_STATUS(request, { params: { taskId: "task-uuid-1", itemIndex: "0.0" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 400 when status is missing", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/items/0/status", {})
      const response = await PUT_ITEM_STATUS(request, { params: { taskId: "task-uuid-1", itemIndex: "0" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Status is required")
    })

    it("should return 400 for item index out of range", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/items/999/status", {
        status: "in_progress",
      })
      const response = await PUT_ITEM_STATUS(request, { params: { taskId: "task-uuid-1", itemIndex: "999" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Item index out of range")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/items/0/status", {
        status: "in_progress",
      })
      const response = await PUT_ITEM_STATUS(request, { params: { taskId: "task-uuid-1", itemIndex: "0" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("DELETE /api/tasks/:taskId/items/:itemIndex", () => {
    it("should delete a task item", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1/items/0")
      const response = await DELETE_TASK_ITEM(request, { params: { taskId: "task-uuid-1", itemIndex: "0" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should delete a nested task item", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1/items/0.0")
      const response = await DELETE_TASK_ITEM(request, { params: { taskId: "task-uuid-1", itemIndex: "0.0" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 404 for non-existent task", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/nonexistent/items/0")
      const response = await DELETE_TASK_ITEM(request, { params: { taskId: "nonexistent", itemIndex: "0" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Task not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1/items/0")
      const response = await DELETE_TASK_ITEM(request, { params: { taskId: "task-uuid-1", itemIndex: "0" } })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })
})
