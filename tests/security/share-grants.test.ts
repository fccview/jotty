import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { resetAllMocks, createFormData } from '../setup'
import { PermissionTypes } from '@/app/_types/enums'

const VICTIM = 'victim'
const READER = 'reader'
const MALLORY = 'mallory'
const LIST_UUID = '8b3e4d6a-ac5f-4e70-9b32-4d5e6f708192'
const LIST_PATH = '/data/checklists/victim/Work/board.md'

const GRANTS: Record<string, PermissionTypes[]> = {
  [VICTIM]: [
    PermissionTypes.READ,
    PermissionTypes.EDIT,
    PermissionTypes.CREATE,
    PermissionTypes.DELETE,
  ],
  [READER]: [PermissionTypes.READ],
}

const mockGetCurrentUser = vi.fn()
const mockAuthenticateApiKey = vi.fn()
const mockWrite = vi.fn()

const holds = (username: string, permission: PermissionTypes) =>
  (GRANTS[username] || []).includes(permission)

const victimBoard = () => ({
  uuid: LIST_UUID,
  id: 'board',
  title: 'Board',
  category: 'Work',
  owner: VICTIM,
  type: 'kanban',
  statuses: [
    { id: 'todo', label: 'To Do', order: 0 },
    { id: 'review', label: 'Review', order: 1 },
    { id: 'completed', label: 'Completed', order: 2 },
  ],
  items: [
    {
      id: 'milk',
      text: 'Milk',
      completed: false,
      order: 0,
      status: 'review',
      children: [{ id: 'oat', text: 'Oat', completed: false, order: 0, status: 'review' }],
    },
  ],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

vi.mock('@/app/_server/actions/users', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  getUsername: async () => (await mockGetCurrentUser())?.username || '',
  isAdmin: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/app/_server/actions/users/records', () => ({
  findUserRecord: vi.fn(async (username: string) => (username ? { username } : null)),
}))

vi.mock('@/app/_server/actions/file', () => ({
  ensureDir: vi.fn(),
  getUserModeDir: vi.fn(),
  serverWriteFile: (...args: unknown[]) => mockWrite(...args),
}))

vi.mock('@/app/_server/actions/checklist/queries', () => ({
  getListById: async (_uuid: string, username?: string) =>
    !username || GRANTS[username] ? victimBoard() : undefined,
  getUserChecklists: vi.fn(),
}))

vi.mock('@/app/_server/actions/share/queries', () => ({
  canReach: async (_uuid: string, _type: string, username: string, permission: PermissionTypes) =>
    holds(username, permission),
  reachableFile: async (_uuid: string, _type: string, username: string, permission: PermissionTypes) =>
    holds(username, permission) ? LIST_PATH : null,
  usersWithAccess: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/app/_server/actions/ws/broadcast', () => ({
  broadcast: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/app/_server/actions/notifications/internal', () => ({
  notifyUser: vi.fn(),
}))

vi.mock('@/app/_server/actions/api/authenticate', () => ({
  authenticateApiKey: (...args: unknown[]) => mockAuthenticateApiKey(...args),
}))

vi.mock('@/app/_server/actions/lib/legacy-lookup', () => ({
  resolveApiId: async (_mode: string, param: string) => param,
}))

const signIn = (username: string | null) =>
  mockGetCurrentUser.mockResolvedValue(username ? { username, isAdmin: false } : null)

const keyFor = (username: string) =>
  mockAuthenticateApiKey.mockResolvedValue({ username, isAdmin: false })

const apiRequest = (method: string, url: string, body?: unknown) =>
  new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'some-key' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

type Call = () => Promise<Response>

const boardParams = <T extends Record<string, string>>(extra = {} as T) => ({
  params: Promise.resolve({ boardId: LIST_UUID, ...extra }),
})
const listParams = <T extends Record<string, string>>(extra = {} as T) => ({
  params: Promise.resolve({ listId: LIST_UUID, ...extra }),
})
const taskParams = <T extends Record<string, string>>(extra = {} as T) => ({
  params: Promise.resolve({ taskId: LIST_UUID, ...extra }),
})

const itemShareRoutes = async (): Promise<Record<string, Call>> => {
  const checklistItem = await import('@/app/api/checklists/[listId]/items/[itemIndex]/route')
  const checklistItems = await import('@/app/api/checklists/[listId]/items/route')
  const taskItems = await import('@/app/api/tasks/[taskId]/items/route')
  const taskItem = await import('@/app/api/tasks/[taskId]/items/[itemIndex]/route')
  const taskStatuses = await import('@/app/api/tasks/[taskId]/statuses/route')
  const taskStatus = await import('@/app/api/tasks/[taskId]/statuses/[statusId]/route')

  return {
    'DELETE /api/checklists/:id/items/:index': () =>
      checklistItem.DELETE(
        apiRequest('DELETE', `/api/checklists/${LIST_UUID}/items/0`),
        listParams({ itemIndex: '0' }),
      ),
    'POST /api/checklists/:id/items (sub-item)': () =>
      checklistItems.POST(
        apiRequest('POST', `/api/checklists/${LIST_UUID}/items`, { text: 'Butter', parentIndex: '0' }),
        listParams(),
      ),
    'POST /api/tasks/:id/items (sub-item)': () =>
      taskItems.POST(
        apiRequest('POST', `/api/tasks/${LIST_UUID}/items`, { text: 'Butter', parentIndex: '0' }),
        taskParams(),
      ),
    'DELETE /api/tasks/:id/items/:index': () =>
      taskItem.DELETE(
        apiRequest('DELETE', `/api/tasks/${LIST_UUID}/items/0`),
        taskParams({ itemIndex: '0' }),
      ),
    'POST /api/tasks/:id/statuses': () =>
      taskStatuses.POST(
        apiRequest('POST', `/api/tasks/${LIST_UUID}/statuses`, { id: 'blocked', label: 'Blocked' }),
        taskParams(),
      ),
    'PUT /api/tasks/:id/statuses/:statusId': () =>
      taskStatus.PUT(
        apiRequest('PUT', `/api/tasks/${LIST_UUID}/statuses/review`, { label: 'QA' }),
        taskParams({ statusId: 'review' }),
      ),
    'DELETE /api/tasks/:id/statuses/:statusId': () =>
      taskStatus.DELETE(
        apiRequest('DELETE', `/api/tasks/${LIST_UUID}/statuses/review`),
        taskParams({ statusId: 'review' }),
      ),
  }
}

const kanbanRoutes = async (): Promise<Record<string, Call>> => {
  const statuses = await import('@/app/api/kanban/[boardId]/statuses/route')
  const item = await import('@/app/api/kanban/[boardId]/items/[itemId]/route')
  const assign = await import('@/app/api/kanban/[boardId]/items/[itemId]/assign/route')
  const reminder = await import('@/app/api/kanban/[boardId]/items/[itemId]/reminder/route')

  return {
    'PUT /api/kanban/:id/statuses': () =>
      statuses.PUT(
        apiRequest('PUT', `/api/kanban/${LIST_UUID}/statuses`, {
          statuses: [
            { id: 'todo', label: 'To Do', order: 0 },
            { id: 'completed', label: 'Completed', order: 1 },
          ],
        }),
        boardParams(),
      ),
    'DELETE /api/kanban/:id/items/:itemId': () =>
      item.DELETE(
        apiRequest('DELETE', `/api/kanban/${LIST_UUID}/items/milk`),
        boardParams({ itemId: 'milk' }),
      ),
    'PUT /api/kanban/:id/items/:itemId/assign': () =>
      assign.PUT(
        apiRequest('PUT', `/api/kanban/${LIST_UUID}/items/milk/assign`, { assignee: VICTIM }),
        boardParams({ itemId: 'milk' }),
      ),
    'PUT /api/kanban/:id/items/:itemId/reminder': () =>
      reminder.PUT(
        apiRequest('PUT', `/api/kanban/${LIST_UUID}/items/milk/reminder`, {
          datetime: '2030-01-01T09:00:00.000Z',
        }),
        boardParams({ itemId: 'milk' }),
      ),
    'DELETE /api/kanban/:id/items/:itemId/reminder': () =>
      reminder.DELETE(
        apiRequest('DELETE', `/api/kanban/${LIST_UUID}/items/milk/reminder`),
        boardParams({ itemId: 'milk' }),
      ),
  }
}

describe('Security: share grants hold on every board read and mutation', () => {
  beforeEach(() => {
    resetAllMocks()
    signIn(null)
    mockAuthenticateApiKey.mockResolvedValue(null)
    mockWrite.mockResolvedValue(undefined)
  })

  describe('kanban calendar and search actions', () => {
    const readers = async () => {
      const { exportBoardAsICS, getCalendarEvents } = await import('@/app/_server/actions/kanban/calendar')
      const { searchKanbanItems } = await import('@/app/_server/actions/kanban/search')
      return [exportBoardAsICS, getCalendarEvents, searchKanbanItems]
    }

    it('refuse without a session', async () => {
      for (const action of await readers()) {
        expect(await action(createFormData({ uuid: LIST_UUID }))).toEqual({ error: 'Not authenticated' })
      }
    })

    it('refuse a stranger holding the uuid', async () => {
      signIn(MALLORY)

      for (const action of await readers()) {
        const result = (await action(createFormData({ uuid: LIST_UUID }))) as { success?: boolean; data?: unknown }
        expect(result.success).toBeUndefined()
        expect(result.data).toBeUndefined()
      }
    })

    it('serve a user holding a READ share', async () => {
      signIn(READER)

      for (const action of await readers()) {
        const result = (await action(createFormData({ uuid: LIST_UUID }))) as { success?: boolean }
        expect(result.success).toBe(true)
      }
    })
  })

  describe('an API key user holding only READ', () => {
    beforeEach(() => keyFor(READER))

    it('is refused on every item and status mutation route and writes nothing', async () => {
      for (const [name, call] of Object.entries(await itemShareRoutes())) {
        const response = await call()

        expect({ name, status: response.status }).toEqual({ name, status: 403 })
        expect(await response.json()).toEqual({ error: 'Forbidden' })
      }

      expect(mockWrite).not.toHaveBeenCalled()
    })

    it('is refused on the kanban mutation routes and writes nothing', async () => {
      for (const [name, call] of Object.entries(await kanbanRoutes())) {
        const response = await call()
        const body = await response.json()

        expect({ name, status: response.status }).toEqual({ name, status: 403 })
        expect(body.success).toBeUndefined()
        expect(body.error).toBe('Forbidden')
      }

      expect(mockWrite).not.toHaveBeenCalled()
    })

    it('is refused by the queued cores themselves, not just the routes', async () => {
      const { removeItem } = await import('@/app/_server/actions/checklist-item/remover')
      const { graftItem } = await import('@/app/_server/actions/checklist-item/grafter')
      const { restatus } = await import('@/app/_server/actions/checklist/restatus')
      const { tweakItem } = await import('@/app/_server/actions/kanban/tweaker')
      const reader = { username: READER, isAdmin: false } as never

      const results = [
        await removeItem(reader, LIST_UUID, 'milk'),
        await graftItem(reader, createFormData({ uuid: LIST_UUID, parentId: 'milk', text: 'Butter' })),
        await restatus(reader, LIST_UUID, () => []),
        await tweakItem(reader, LIST_UUID, 'milk', { priority: 'high' as never }),
      ]

      for (const result of results) {
        expect(result.success).toBe(false)
      }
      expect(mockWrite).not.toHaveBeenCalled()
    })
  })

  describe('the owner via API key', () => {
    beforeEach(() => keyFor(VICTIM))

    it('still succeeds on every item and status mutation route', async () => {
      for (const [name, call] of Object.entries(await itemShareRoutes())) {
        mockWrite.mockClear()
        const response = await call()
        const body = await response.json()

        expect({ name, status: response.status }).toEqual({ name, status: 200 })
        expect(body.success).toBe(true)
        expect(mockWrite).toHaveBeenCalledOnce()
        expect(mockWrite.mock.calls[0][0]).toBe(LIST_PATH)
      }
    })

    it('still succeeds on the kanban mutation routes without a session', async () => {
      for (const [name, call] of Object.entries(await kanbanRoutes())) {
        mockWrite.mockClear()
        const response = await call()
        const body = await response.json()

        expect({ name, status: response.status }).toEqual({ name, status: 200 })
        expect(body.success).toBe(true)
        expect(mockWrite).toHaveBeenCalledOnce()
      }
    })

    it('rehomes items on nested levels when a status is deleted', async () => {
      const { DELETE } = await import('@/app/api/tasks/[taskId]/statuses/[statusId]/route')

      await DELETE(
        apiRequest('DELETE', `/api/tasks/${LIST_UUID}/statuses/review`),
        taskParams({ statusId: 'review' }),
      )

      const { listToMarkdown } = await import('@/app/_utils/checklist-utils')
      const written = vi.mocked(listToMarkdown).mock.calls.at(-1)?.[0]

      expect(written?.statuses?.map((status) => status.id)).toEqual(['todo', 'completed'])
      expect(written?.items[0].status).toBe('todo')
      expect(written?.items[0].children?.[0].status).toBe('todo')
    })
  })
})
