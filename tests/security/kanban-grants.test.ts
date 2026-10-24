import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { resetAllMocks } from '../setup'
import { PermissionTypes } from '@/app/_types/enums'

const OWNER = 'owner'
const READER = 'reader'
const EDITOR = 'editor'
const STRANGER = 'stranger'
const BOARD_UUID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
const BOARD_PATH = '/data/checklists/owner/Work/board.md'

const GRANTS: Record<string, PermissionTypes[]> = {
  [OWNER]: [PermissionTypes.READ, PermissionTypes.EDIT, PermissionTypes.CREATE, PermissionTypes.DELETE],
  [EDITOR]: [PermissionTypes.READ, PermissionTypes.EDIT],
  [READER]: [PermissionTypes.READ],
}

const mockAuthenticateApiKey = vi.fn()
const mockWrite = vi.fn()
const mockDelete = vi.fn()

const holds = (username: string, permission: PermissionTypes) =>
  (GRANTS[username] || []).includes(permission)

const ownerBoard = () => ({
  uuid: BOARD_UUID,
  id: 'board',
  title: 'Board',
  category: 'Work',
  owner: OWNER,
  type: 'kanban',
  statuses: [
    { id: 'todo', label: 'To Do', order: 0 },
    { id: 'done', label: 'Done', order: 1 },
  ],
  items: [{ id: 'card', text: 'Card', completed: false, order: 0, status: 'todo' }],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

vi.mock('@/app/_server/actions/users', () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
  getUsername: vi.fn().mockResolvedValue(''),
  isAdmin: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/app/_server/actions/users/records', () => ({
  findUserRecord: vi.fn(async (username: string) => (username && username !== 'ghost' ? { username } : null)),
}))

vi.mock('@/app/_server/actions/file', () => ({
  ensureDir: vi.fn(),
  getUserModeDir: vi.fn(),
  serverWriteFile: (...args: unknown[]) => mockWrite(...args),
  serverDeleteFile: (...args: unknown[]) => mockDelete(...args),
}))

vi.mock('@/app/_server/actions/checklist/queries', () => ({
  getListById: async (_uuid: string, username?: string) =>
    !username || GRANTS[username] ? ownerBoard() : undefined,
  getUserChecklists: vi.fn(),
}))

vi.mock('@/app/_server/actions/share/queries', () => ({
  canReach: async (_uuid: string, _type: string, username: string, permission: PermissionTypes) =>
    holds(username, permission),
  reachableFile: async (_uuid: string, _type: string, username: string, permission: PermissionTypes) =>
    holds(username, permission) ? BOARD_PATH : null,
  usersWithAccess: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/app/_server/actions/ws/broadcast', () => ({
  broadcast: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/app/_server/actions/notifications/internal', () => ({
  notifyUser: vi.fn(),
}))

vi.mock('@/app/_server/actions/log', () => ({
  logContentEvent: vi.fn(),
}))

vi.mock('@/app/_server/actions/api/authenticate', () => ({
  authenticateApiKey: (...args: unknown[]) => mockAuthenticateApiKey(...args),
}))

vi.mock('@/app/_server/actions/lib/legacy-lookup', () => ({
  resolveApiId: async (_mode: string, param: string) => param,
}))

const keyFor = (username: string) =>
  mockAuthenticateApiKey.mockResolvedValue({ username, isAdmin: false })

const apiRequest = (method: string, url: string, body?: unknown) =>
  new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'some-key' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

type Call = () => Promise<Response>

const onBoard = (extra: Record<string, string> = {}) => ({
  params: Promise.resolve({ boardId: BOARD_UUID, ...extra }),
})
const onCard = () => onBoard({ itemId: 'card' })
const BASE = `/api/kanban/${BOARD_UUID}`

const readRoutes = async (): Promise<Record<string, Call>> => {
  const board = await import('@/app/api/kanban/[boardId]/route')
  const calendar = await import('@/app/api/kanban/[boardId]/calendar/route')

  return {
    'GET /api/kanban/:id': () => board.GET(apiRequest('GET', BASE), onBoard()),
    'GET /api/kanban/:id/calendar': () => calendar.GET(apiRequest('GET', `${BASE}/calendar`), onBoard()),
  }
}

const editRoutes = async (): Promise<Record<string, Call>> => {
  const board = await import('@/app/api/kanban/[boardId]/route')
  const statuses = await import('@/app/api/kanban/[boardId]/statuses/route')
  const items = await import('@/app/api/kanban/[boardId]/items/route')
  const item = await import('@/app/api/kanban/[boardId]/items/[itemId]/route')
  const status = await import('@/app/api/kanban/[boardId]/items/[itemId]/status/route')
  const assign = await import('@/app/api/kanban/[boardId]/items/[itemId]/assign/route')
  const reminder = await import('@/app/api/kanban/[boardId]/items/[itemId]/reminder/route')

  return {
    'PUT /api/kanban/:id': () => board.PUT(apiRequest('PUT', BASE, { title: 'Taken' }), onBoard()),
    'PUT /api/kanban/:id/statuses': () =>
      statuses.PUT(apiRequest('PUT', `${BASE}/statuses`, { statuses: [{ id: 'todo', label: 'To Do', order: 0 }] }), onBoard()),
    'POST /api/kanban/:id/items': () => items.POST(apiRequest('POST', `${BASE}/items`, { text: 'Sneaky' }), onBoard()),
    'PUT /api/kanban/:id/items/:itemId': () => item.PUT(apiRequest('PUT', `${BASE}/items/card`, { text: 'Mine' }), onCard()),
    'PUT /api/kanban/:id/items/:itemId/status': () =>
      status.PUT(apiRequest('PUT', `${BASE}/items/card/status`, { status: 'done' }), onCard()),
    'PUT /api/kanban/:id/items/:itemId/assign': () =>
      assign.PUT(apiRequest('PUT', `${BASE}/items/card/assign`, { assignee: READER }), onCard()),
    'PUT /api/kanban/:id/items/:itemId/reminder': () =>
      reminder.PUT(apiRequest('PUT', `${BASE}/items/card/reminder`, { datetime: '2030-01-01T09:00:00.000Z' }), onCard()),
    'DELETE /api/kanban/:id/items/:itemId/reminder': () =>
      reminder.DELETE(apiRequest('DELETE', `${BASE}/items/card/reminder`), onCard()),
  }
}

const deleteRoutes = async (): Promise<Record<string, Call>> => {
  const board = await import('@/app/api/kanban/[boardId]/route')
  const item = await import('@/app/api/kanban/[boardId]/items/[itemId]/route')

  return {
    'DELETE /api/kanban/:id': () => board.DELETE(apiRequest('DELETE', BASE), onBoard()),
    'DELETE /api/kanban/:id/items/:itemId': () => item.DELETE(apiRequest('DELETE', `${BASE}/items/card`), onCard()),
  }
}

const expectRefused = async (routes: Record<string, Call>, status: number) => {
  for (const [name, call] of Object.entries(routes)) {
    const response = await call()
    const body = await response.json()

    expect({ name, status: response.status }).toEqual({ name, status })
    expect(body.success).toBeUndefined()
    expect(body.error).toBeTruthy()
  }
  expect(mockWrite).not.toHaveBeenCalled()
  expect(mockDelete).not.toHaveBeenCalled()
}

describe('Security: kanban API routes hold every share grant', () => {
  beforeEach(() => {
    resetAllMocks()
    mockAuthenticateApiKey.mockResolvedValue(null)
    mockWrite.mockResolvedValue(undefined)
    mockDelete.mockResolvedValue(undefined)
  })

  describe('a stranger holding the board uuid', () => {
    beforeEach(() => keyFor(STRANGER))

    it('cannot read the board or its calendar', async () => {
      await expectRefused(await readRoutes(), 404)
    })

    it('cannot change or delete anything', async () => {
      await expectRefused({ ...(await editRoutes()), ...(await deleteRoutes()) }, 404)
    })
  })

  describe('a user holding only READ', () => {
    beforeEach(() => keyFor(READER))

    it('can read the board and its calendar', async () => {
      for (const [name, call] of Object.entries(await readRoutes())) {
        expect({ name, status: (await call()).status }).toEqual({ name, status: 200 })
      }
    })

    it('is refused on every edit route and writes nothing', async () => {
      await expectRefused(await editRoutes(), 403)
    })

    it('is refused on every delete route and deletes nothing', async () => {
      await expectRefused(await deleteRoutes(), 403)
    })
  })

  describe('the owner', () => {
    beforeEach(() => keyFor(OWNER))

    it('gets through the same routes and writes the board file', async () => {
      const through = [
        'PUT /api/kanban/:id/statuses',
        'POST /api/kanban/:id/items',
        'PUT /api/kanban/:id/items/:itemId',
        'PUT /api/kanban/:id/items/:itemId/assign',
        'PUT /api/kanban/:id/items/:itemId/reminder',
        'DELETE /api/kanban/:id/items/:itemId/reminder',
        'DELETE /api/kanban/:id/items/:itemId',
      ]
      const routes = { ...(await editRoutes()), ...(await deleteRoutes()) }

      for (const name of through) {
        mockWrite.mockClear()
        const response = await routes[name]()

        expect({ name, status: response.status }).toEqual({ name, status: 200 })
        expect(mockWrite).toHaveBeenCalledOnce()
        expect(mockWrite.mock.calls[0][0]).toBe(BOARD_PATH)
      }
    })
  })

  describe('assigning a card', () => {
    beforeEach(() => keyFor(OWNER))

    it.each([
      ['a user that does not exist', 'ghost', "Assignee not found"],
      ['a user who cannot see the board', STRANGER, "Assignee can't see this board"],
    ])('refuses %s and writes nothing', async (_label, assignee, message) => {
      const { PUT } = await import('@/app/api/kanban/[boardId]/items/[itemId]/assign/route')

      const response = await PUT(apiRequest('PUT', `${BASE}/items/card/assign`, { assignee }), onCard())

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe(message)
      expect(mockWrite).not.toHaveBeenCalled()
    })
  })

  describe('assigning without EDIT', () => {
    it.each(['ghost', STRANGER, EDITOR])('refuses %s the same way, before looking up the assignee', async (assignee) => {
      const { assignItem } = await import('@/app/_server/actions/kanban/tweaker')
      const reader = { username: READER, isAdmin: false } as Parameters<typeof assignItem>[0]

      const result = await assignItem(reader, BOARD_UUID, 'card', assignee)

      expect(result).toEqual({ success: false, error: 'Permission denied' })
      expect(mockWrite).not.toHaveBeenCalled()
    })
  })

  describe('assigning through a card update', () => {
    beforeEach(() => keyFor(OWNER))

    it.each([
      ['a user that does not exist', 'ghost', "Assignee not found"],
      ['a user who cannot see the board', STRANGER, "Assignee can't see this board"],
      ['a name that walks out of the notifications folder', '../users/owner', "Assignee not found"],
    ])('refuses %s and writes nothing', async (_label, assignee, message) => {
      const { PUT } = await import('@/app/api/kanban/[boardId]/items/[itemId]/route')

      const response = await PUT(apiRequest('PUT', `${BASE}/items/card`, { assignee }), onCard())

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe(message)
      expect(mockWrite).not.toHaveBeenCalled()
    })

    it('still assigns someone who can see the board', async () => {
      const { PUT } = await import('@/app/api/kanban/[boardId]/items/[itemId]/route')

      const response = await PUT(apiRequest('PUT', `${BASE}/items/card`, { assignee: READER }), onCard())

      expect(response.status).toBe(200)
      expect(mockWrite).toHaveBeenCalled()
    })
  })

  describe('moving a card to a column the board does not have', () => {
    beforeEach(() => keyFor(OWNER))

    it('answers 400 and writes nothing', async () => {
      const { PUT } = await import('@/app/api/kanban/[boardId]/items/[itemId]/status/route')

      const response = await PUT(apiRequest('PUT', `${BASE}/items/card/status`, { status: 'nowhere' }), onCard())

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('Status not found on this board. Its columns are todo, done')
      expect(mockWrite).not.toHaveBeenCalled()
    })
  })

  describe('an unknown card', () => {
    beforeEach(() => keyFor(OWNER))

    it('answers 404 on every card route and writes nothing', async () => {
      const onGhostCard = () => onBoard({ itemId: 'no-such-card' })
      const item = await import('@/app/api/kanban/[boardId]/items/[itemId]/route')
      const status = await import('@/app/api/kanban/[boardId]/items/[itemId]/status/route')
      const assign = await import('@/app/api/kanban/[boardId]/items/[itemId]/assign/route')
      const reminder = await import('@/app/api/kanban/[boardId]/items/[itemId]/reminder/route')
      const calls: Call[] = [
        () => item.PUT(apiRequest('PUT', `${BASE}/items/no-such-card`, { text: 'x' }), onGhostCard()),
        () => item.DELETE(apiRequest('DELETE', `${BASE}/items/no-such-card`), onGhostCard()),
        () => status.PUT(apiRequest('PUT', `${BASE}/items/no-such-card/status`, { status: 'done' }), onGhostCard()),
        () => assign.PUT(apiRequest('PUT', `${BASE}/items/no-such-card/assign`, { assignee: EDITOR }), onGhostCard()),
        () => reminder.PUT(apiRequest('PUT', `${BASE}/items/no-such-card/reminder`, { datetime: '2030-01-01T09:00:00.000Z' }), onGhostCard()),
        () => reminder.DELETE(apiRequest('DELETE', `${BASE}/items/no-such-card/reminder`), onGhostCard()),
      ]

      for (const call of calls) expect((await call()).status).toBe(404)
      expect(mockWrite).not.toHaveBeenCalled()
      expect(mockDelete).not.toHaveBeenCalled()
    })
  })

  describe('a user holding EDIT but not DELETE', () => {
    beforeEach(() => keyFor(EDITOR))

    it('can still move cards around', async () => {
      const { PUT } = await import('@/app/api/kanban/[boardId]/items/[itemId]/assign/route')

      const response = await PUT(apiRequest('PUT', `${BASE}/items/card/assign`, { assignee: EDITOR }), onCard())

      expect(response.status).toBe(200)
      expect(mockWrite).toHaveBeenCalledOnce()
      expect(mockWrite.mock.calls[0][0]).toBe(BOARD_PATH)
    })

    it('cannot delete the board or a card', async () => {
      await expectRefused(await deleteRoutes(), 403)
    })
  })
})
