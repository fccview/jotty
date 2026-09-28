import { describe, it, expect, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetUserChecklists,
  mockCreateList,
  mockMakeList,
  mockEditList,
  mockDropList,
  mockGetListById,
  mockAddItem,
  mockStampStatus,
  mockServerWriteFile,
  mockRestatus,
  mockCanReach,
  mockGraftItem,
  mockRemoveItem,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup"

import { GET as GET_TASKS, POST as POST_TASKS } from "@/app/api/tasks/route"
import { GET as GET_TASK, PUT as PUT_TASK, DELETE as DELETE_TASK } from "@/app/api/tasks/[taskId]/route"
import { GET as GET_STATUSES, POST as POST_STATUS } from "@/app/api/tasks/[taskId]/statuses/route"
import { PUT as PUT_STATUS, DELETE as DELETE_STATUS } from "@/app/api/tasks/[taskId]/statuses/[statusId]/route"
import { POST as POST_TASK_ITEM } from "@/app/api/tasks/[taskId]/items/route"
import { DELETE as DELETE_TASK_ITEM, GET as GET_TASK_ITEM } from "@/app/api/tasks/[taskId]/items/[itemIndex]/route"
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
        description: "Task notes",
        priority: "high",
        score: 8,
        startDate: "2026-06-10",
        targetDate: "2026-06-15",
        estimatedTime: 3.5,
        createdBy: "testuser",
        createdAt: "2024-01-01T00:00:00.000Z",
        lastModifiedBy: "testuser",
        lastModifiedAt: "2024-01-02T00:00:00.000Z",
        history: [
          {
            status: "todo",
            timestamp: "2024-01-01T00:00:00.000Z",
            user: "testuser",
          },
        ],
        children: [
          {
            id: "item-1-1",
            text: "Sub Task",
            status: "todo",
            completed: false,
            description: "Sub-task notes",
            priority: "medium",
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
      mockMakeList.mockResolvedValue({ success: true, data: newTask })

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
      const response = await GET_TASK(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.task).toBeDefined()
      expect(data.task.title).toBe("Test Task Board")
    })

    it("should return 404 for non-existent task", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/nonexistent")
      const response = await GET_TASK(request, { params: Promise.resolve({ taskId: "nonexistent" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Task not found")
    })

    it("should return 400 for non-task checklist", async () => {
      mockGetListById.mockResolvedValue({ ...mockTask, type: "simple" })

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1")
      const response = await GET_TASK(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Not a task checklist")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1")
      const response = await GET_TASK(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("PUT /api/tasks/:taskId", () => {
    it("should update a task", async () => {
      const updatedTask = { ...mockTask, title: "Updated Task Board", category: "Work" }
      mockGetListById.mockResolvedValue(mockTask)
      mockEditList.mockResolvedValue({ success: true, data: updatedTask })

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1", {
        title: "Updated Task Board",
        category: "Work",
      })
      const response = await PUT_TASK(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
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
      const response = await PUT_TASK(request, { params: Promise.resolve({ taskId: "nonexistent" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Task not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1", {
        title: "Updated",
      })
      const response = await PUT_TASK(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("DELETE /api/tasks/:taskId", () => {
    it("should delete a task", async () => {
      mockGetListById.mockResolvedValue(mockTask)
      mockDropList.mockResolvedValue({ success: true })

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1")
      const response = await DELETE_TASK(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 404 for non-existent task", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/nonexistent")
      const response = await DELETE_TASK(request, { params: Promise.resolve({ taskId: "nonexistent" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Task not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1")
      const response = await DELETE_TASK(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("GET /api/tasks/:taskId/statuses", () => {
    it("should return statuses", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1/statuses")
      const response = await GET_STATUSES(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(Array.isArray(data.statuses)).toBe(true)
      expect(data.statuses.length).toBeGreaterThanOrEqual(3)
    })

    it("should return 404 for non-existent task", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/nonexistent/statuses")
      const response = await GET_STATUSES(request, { params: Promise.resolve({ taskId: "nonexistent" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Task not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1/statuses")
      const response = await GET_STATUSES(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
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
      const response = await POST_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
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
      const response = await POST_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
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
      const response = await POST_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
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
      const response = await POST_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
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
      const response = await PUT_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1", statusId: "in_progress" }) })
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
      const response = await PUT_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1", statusId: "nonexistent" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Status not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/statuses/todo", {
        label: "Updated",
      })
      const response = await PUT_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1", statusId: "todo" }) })
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
      const response = await DELETE_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1", statusId: "review" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 404 for non-existent status", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1/statuses/nonexistent")
      const response = await DELETE_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1", statusId: "nonexistent" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Status not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1/statuses/todo")
      const response = await DELETE_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1", statusId: "todo" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("POST /api/tasks/:taskId/items", () => {
    it("should create a task item", async () => {
      mockGetListById.mockResolvedValue(mockTask)
      mockAddItem.mockResolvedValue({ success: true, data: { id: "new-item" } })

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/items", {
        text: "Implement feature X",
        status: "todo",
      })
      const response = await POST_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
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
      const response = await POST_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 400 when text is missing", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/items", {
        status: "todo",
      })
      const response = await POST_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Text is required")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/items", {
        text: "Test",
      })
      const response = await POST_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("PUT /api/tasks/:taskId/items/:itemIndex/status", () => {
    it("should update item status", async () => {
      mockGetListById.mockResolvedValue(mockTask)
      mockStampStatus.mockResolvedValue({ success: true })

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/items/0/status", {
        status: "in_progress",
      })
      const response = await PUT_ITEM_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should update nested item status", async () => {
      mockGetListById.mockResolvedValue(mockTask)
      mockStampStatus.mockResolvedValue({ success: true })

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/items/0.0/status", {
        status: "in_progress",
      })
      const response = await PUT_ITEM_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1", itemIndex: "0.0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 400 when status is missing", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/items/0/status", {})
      const response = await PUT_ITEM_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Status is required")
    })

    it("should return 400 for item index out of range", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/items/999/status", {
        status: "in_progress",
      })
      const response = await PUT_ITEM_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1", itemIndex: "999" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Item index out of range")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/items/0/status", {
        status: "in_progress",
      })
      const response = await PUT_ITEM_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("GET /api/tasks/:taskId/items/:itemIndex", () => {
    it("should return a transformed task item with rich fields", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1/items/0")
      const response = await GET_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.item).toMatchObject({
        id: "item-1",
        index: 0,
        text: "Task Item 1",
        completed: false,
        status: "todo",
        time: 0,
        description: "Task notes",
        priority: "high",
        score: 8,
        startDate: "2026-06-10",
        targetDate: "2026-06-15",
        estimatedTime: 3.5,
        createdBy: "testuser",
        createdAt: "2024-01-01T00:00:00.000Z",
        lastModifiedBy: "testuser",
        lastModifiedAt: "2024-01-02T00:00:00.000Z",
        history: [
          {
            status: "todo",
            timestamp: "2024-01-01T00:00:00.000Z",
            user: "testuser",
          },
        ],
      })
      expect(data.item.children[0]).toMatchObject({
        id: "item-1-1",
        index: 0,
        description: "Sub-task notes",
        priority: "medium",
      })
    })

    it("should return a transformed nested task item", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1/items/0.0")
      const response = await GET_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1", itemIndex: "0.0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.item).toMatchObject({
        id: "item-1-1",
        index: 0,
        text: "Sub Task",
        status: "todo",
        time: 0,
        description: "Sub-task notes",
      })
    })

    it("should return 400 for non-task checklist item reads", async () => {
      mockGetListById.mockResolvedValue({ ...mockTask, type: "simple" })

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1/items/0")
      const response = await GET_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Not a task checklist")
    })
  })

  describe("DELETE /api/tasks/:taskId/items/:itemIndex", () => {
    it("should delete a task item", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1/items/0")
      const response = await DELETE_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should delete a nested task item", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1/items/0.0")
      const response = await DELETE_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1", itemIndex: "0.0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 404 for non-existent task", async () => {
      mockGetListById.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/nonexistent/items/0")
      const response = await DELETE_TASK_ITEM(request, { params: Promise.resolve({ taskId: "nonexistent", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe("Task not found")
    })

    it("should return 401 for unauthorized requests", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null)

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1/items/0")
      const response = await DELETE_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1", itemIndex: "0" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("default statuses", () => {
    const bareTask = { ...mockTask, statuses: undefined }

    it("sends label alongside the legacy name when a task has no stored statuses", async () => {
      mockGetListById.mockResolvedValue(bareTask)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1")
      const response = await GET_TASK(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(data.task.statuses).toEqual([
        { id: "todo", label: "To Do", name: "To Do", order: 0 },
        { id: "in_progress", label: "In Progress", name: "In Progress", order: 1 },
        { id: "completed", label: "Completed", name: "Completed", order: 2 },
      ])
    })

    it("does the same on list, create and update", async () => {
      mockGetUserChecklists.mockResolvedValue({ success: true, data: [bareTask] })
      mockMakeList.mockResolvedValue({ success: true, data: bareTask })
      mockGetListById.mockResolvedValue(bareTask)
      mockEditList.mockResolvedValue({ success: true, data: bareTask })

      const listed = await getResponseJson(await GET_TASKS(createMockRequest("GET", "http://localhost:3000/api/tasks")))
      const created = await getResponseJson(
        await POST_TASKS(createMockRequest("POST", "http://localhost:3000/api/tasks", { title: "Board" })),
      )
      const updated = await getResponseJson(
        await PUT_TASK(createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1", { title: "Board" }), {
          params: Promise.resolve({ taskId: "task-uuid-1" }),
        }),
      )

      ;[listed.tasks[0], created.data, updated.data].forEach((task) => {
        expect(task.statuses[0]).toEqual({ id: "todo", label: "To Do", name: "To Do", order: 0 })
      })
      expect(mockRestatus).not.toHaveBeenCalled()
    })

    it("returns stored statuses untouched", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1")
      const data = await getResponseJson(await GET_TASK(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) }))

      expect(data.task.statuses).toEqual(mockTask.statuses)
    })
  })

  describe("POST /api/tasks with statuses", () => {
    const created = { ...mockTask, statuses: undefined, uuid: "new-uuid" }

    it("creates the task with the requested columns in one write", async () => {
      mockMakeList.mockImplementation(async (_user: unknown, _form: FormData, statuses?: unknown[]) => ({
        success: true,
        data: { ...created, statuses },
      }))

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks", {
        title: "Sprint",
        statuses: [
          { id: "todo", label: "To Do", order: 0 },
          { id: "review", label: "In Review", color: "#3b82f6" },
          { id: "done", name: "Done", autoComplete: true },
        ],
      })
      const response = await POST_TASKS(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(200)
      expect(mockRestatus).not.toHaveBeenCalled()
      expect(data.data.statuses).toEqual([
        { id: "todo", label: "To Do", order: 0 },
        { id: "review", label: "In Review", color: "#3b82f6", order: 1 },
        { id: "done", label: "Done", order: 2, autoComplete: true },
      ])
      expect(data.data.items).toEqual([])
    })

    it("refuses columns without an id before creating anything", async () => {
      const request = createMockRequest("POST", "http://localhost:3000/api/tasks", {
        title: "Sprint",
        statuses: [{ label: "No id" }],
      })
      const response = await POST_TASKS(request)
      const data = await getResponseJson(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe("Status id is required")
      expect(mockMakeList).not.toHaveBeenCalled()
    })

    it("refuses duplicate column ids", async () => {
      const request = createMockRequest("POST", "http://localhost:3000/api/tasks", {
        title: "Sprint",
        statuses: [
          { id: "todo", label: "To Do" },
          { id: "todo", label: "Again" },
        ],
      })
      const response = await POST_TASKS(request)

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe("Status ids must be unique")
      expect(mockMakeList).not.toHaveBeenCalled()
    })

  })

  describe("input validation", () => {
    it("returns 400 for a body that is not JSON", async () => {
      const request = new NextRequest(new URL("http://localhost:3000/api/tasks"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": "test-api-key" },
        body: "{not json",
      })
      const response = await POST_TASKS(request)

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe("Request body must be valid JSON")
    })

    it("returns 400 for a malformed item index", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1/items/abc")
      const response = await GET_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1", itemIndex: "abc" }) })

      expect(response.status).toBe(400)
    })

    it("returns 400 for a nested item index out of range", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("GET", "http://localhost:3000/api/tasks/task-uuid-1/items/0.5")
      const response = await GET_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1", itemIndex: "0.5" }) })

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe("Item index out of range")
    })

    it("returns 404 when the parent index does not exist", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/items", {
        text: "Orphan",
        parentIndex: "3",
      })
      const response = await POST_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })

      expect(response.status).toBe(404)
      expect((await getResponseJson(response)).error).toBe("Parent item not found")
      expect(mockGraftItem).not.toHaveBeenCalled()
    })

    it("grafts under a numeric parent index", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/items", {
        text: "Child",
        parentIndex: 0,
      })
      const response = await POST_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })

      expect(response.status).toBe(200)
      const graft = mockGraftItem.mock.calls[0][1] as FormData
      expect(graft.get("parentId")).toBe("item-1")
      expect(graft.get("status")).toBe("todo")
    })

    it("returns 400 for a malformed parent index", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/items", {
        text: "Child",
        parentIndex: "zero",
      })
      const response = await POST_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })

      expect(response.status).toBe(400)
      expect(mockGraftItem).not.toHaveBeenCalled()
    })

    it("uses the exact message when a status label is missing", async () => {
      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/statuses", { id: "review" })
      const response = await POST_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })

      expect(response.status).toBe(400)
      expect((await getResponseJson(response)).error).toBe("Status id and label are required")
    })
  })

  describe("status fields", () => {
    it("keeps autoComplete on create", async () => {
      mockGetListById.mockResolvedValue(mockTask)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/statuses", {
        id: "shipped",
        label: "Shipped",
        autoComplete: true,
      })
      const data = await getResponseJson(
        await POST_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) }),
      )

      expect(data.data).toEqual({ id: "shipped", label: "Shipped", order: 3, autoComplete: true })
    })

    it("updates autoComplete and clears a color sent as null", async () => {
      const colored = {
        ...mockTask,
        statuses: [{ id: "todo", label: "To Do", order: 0, color: "#fff" }],
      }
      mockGetListById.mockResolvedValue(colored)
      mockRestatus.mockImplementation(async (_user: unknown, _uuid: string, reshape: (current?: unknown[]) => unknown[]) => ({
        success: true,
        data: { statuses: reshape(colored.statuses) },
      }))

      const request = createMockRequest("PUT", "http://localhost:3000/api/tasks/task-uuid-1/statuses/todo", {
        autoComplete: true,
        color: null,
      })
      const data = await getResponseJson(
        await PUT_STATUS(request, { params: Promise.resolve({ taskId: "task-uuid-1", statusId: "todo" }) }),
      )

      expect(data.data).toEqual({ id: "todo", label: "To Do", order: 0, autoComplete: true })
    })
  })

  describe("share grants", () => {
    it("refuses adding an item without the edit grant", async () => {
      mockGetListById.mockResolvedValue(mockTask)
      mockCanReach.mockResolvedValue(false)

      const request = createMockRequest("POST", "http://localhost:3000/api/tasks/task-uuid-1/items", { text: "Nope" })
      const response = await POST_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1" }) })

      expect(response.status).toBe(403)
      expect(mockAddItem).not.toHaveBeenCalled()
    })

    it("refuses deleting an item without the delete grant", async () => {
      mockGetListById.mockResolvedValue(mockTask)
      mockCanReach.mockImplementation(async (_uuid: string, _type: string, _user: string, permission: string) =>
        permission !== "canDelete",
      )

      const request = createMockRequest("DELETE", "http://localhost:3000/api/tasks/task-uuid-1/items/0")
      const response = await DELETE_TASK_ITEM(request, { params: Promise.resolve({ taskId: "task-uuid-1", itemIndex: "0" }) })

      expect(response.status).toBe(403)
      expect(mockRemoveItem).not.toHaveBeenCalled()
    })
  })
})
