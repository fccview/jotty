import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { resetAllMocks, createFormData } from '../setup'

const VICTIM = 'victim'
const MALLORY = 'mallory'
const LIST_PATH = '/data/checklists/victim/Personal/shopping.md'

const mockGetCurrentUser = vi.fn()
const mockWrite = vi.fn()
const mockDelete = vi.fn()
const mockCanReach = vi.fn()
const mockAuthenticateApiKey = vi.fn()

const victimNote = () => ({
  uuid: 'note-uuid',
  id: 'diary',
  title: 'Diary',
  content: 'dear diary',
  category: 'Personal',
  owner: VICTIM,
})

const victimList = () => ({
  uuid: 'list-uuid',
  id: 'shopping',
  title: 'Shopping',
  category: 'Personal',
  owner: VICTIM,
  type: 'simple',
  items: [{ id: 'milk', text: 'Milk', completed: false, order: 0 }],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

vi.mock('@/app/_server/actions/users', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  getUsername: async () => (await mockGetCurrentUser())?.username || '',
  isAdmin: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/app/_server/actions/users/records', () => ({
  findUserRecord: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/app/_server/actions/file', () => ({
  ensureDir: vi.fn(),
  getUserModeDir: vi.fn().mockResolvedValue('/data/checklists/victim'),
  serverWriteFile: (...args: unknown[]) => mockWrite(...args),
  serverDeleteFile: (...args: unknown[]) => mockDelete(...args),
}))

vi.mock('@/app/_server/actions/note/queries', () => ({
  getNoteById: async () => victimNote(),
  getUserNotes: async () => ({ success: true, data: [victimNote()] }),
}))

vi.mock('@/app/_server/actions/checklist/queries', () => ({
  getListById: async () => victimList(),
  getUserChecklists: vi.fn(),
}))

vi.mock('@/app/_server/actions/share/queries', () => ({
  canReach: (...args: unknown[]) => mockCanReach(...args),
  reachableFile: async (...args: unknown[]) =>
    (await mockCanReach(...args)) ? LIST_PATH : null,
  usersWithAccess: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/app/_server/actions/share/target', () => ({
  shownAs: vi.fn().mockResolvedValue('Personal'),
  movePlan: vi.fn().mockResolvedValue({
    home: { owner: 'victim', category: 'Personal' },
    destination: { owner: 'victim', category: 'Personal' },
    target: {},
    isMoving: false,
  }),
  bouncer: vi.fn().mockResolvedValue({ allowed: true }),
  targetDir: vi.fn().mockResolvedValue({
    owner: 'victim',
    category: 'Personal',
    dir: '/data/notes/victim/Personal',
    isMount: false,
  }),
  diskPath: vi.fn().mockResolvedValue(LIST_PATH),
  refusalMessage: vi.fn().mockResolvedValue('Refused'),
}))

vi.mock('@/app/_server/actions/relations/tidy', () => ({
  refreshWikilinks: (content: string) => content,
  tidyItemLinks: async (content: string) => content,
}))

vi.mock('@/app/_server/actions/log', () => ({
  logContentEvent: vi.fn(),
  logAudit: vi.fn(),
}))

vi.mock('@/app/_server/actions/ws/broadcast', () => ({
  broadcast: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/app/_server/actions/history', () => ({
  commitNote: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/app/_server/actions/notifications/internal', () => ({
  notifyUser: vi.fn(),
}))

vi.mock('@/app/_server/actions/api', () => ({
  authenticateApiKey: (...args: unknown[]) => mockAuthenticateApiKey(...args),
}))

vi.mock('@/app/_server/actions/lib/legacy-lookup', () => ({
  resolveApiId: async (_mode: string, param: string) => param,
}))

const actorsAsked = () => mockCanReach.mock.calls.map((call) => call[2])

const apiRequest = (method: string, url: string, body?: unknown) =>
  new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'victim-key' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

describe('Security: acting identity comes from the session, never the request', () => {
  beforeEach(() => {
    resetAllMocks()
    mockGetCurrentUser.mockResolvedValue(null)
    mockAuthenticateApiKey.mockResolvedValue(null)
    mockCanReach.mockImplementation(
      async (_uuid: string, _type: string, username: string) => username === VICTIM,
    )
  })

  describe('without a session', () => {
    it('updateNote refuses a victim named in FormData and writes nothing', async () => {
      const { updateNote } = await import('@/app/_server/actions/note/crud')

      for (const user of [VICTIM, JSON.stringify({ username: VICTIM })]) {
        const result = await updateNote(
          createFormData({ uuid: 'note-uuid', title: 'Diary', content: 'pwned', user }),
        )

        expect(result.error).toBe('Not authenticated')
      }

      expect(mockWrite).not.toHaveBeenCalled()
      expect(mockCanReach).not.toHaveBeenCalled()
    })

    it('deleteNote refuses and deletes nothing', async () => {
      const { deleteNote } = await import('@/app/_server/actions/note/crud')

      const result = await deleteNote(createFormData({ uuid: 'note-uuid', user: VICTIM }))

      expect(result.error).toBe('Not authenticated')
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('updateItem and createItem refuse a victim passed as the username argument', async () => {
      const { updateItem, createItem } = await import('@/app/_server/actions/checklist-item/crud')

      const updated = await updateItem(
        victimList() as any,
        createFormData({ itemId: 'milk', completed: 'true' }),
        VICTIM,
      )
      const created = await createItem(
        victimList() as any,
        createFormData({ text: 'pwned' }),
        VICTIM,
      )

      expect(updated).toEqual({ success: false, error: 'Not authenticated' })
      expect(created).toEqual({ success: false, error: 'Not authenticated' })
      expect(mockWrite).not.toHaveBeenCalled()
    })

    it('updateItemStatus and bulk item actions refuse a victim named in FormData', async () => {
      const { updateItemStatus } = await import('@/app/_server/actions/checklist-item/status')
      const { bulkToggleItems, bulkDeleteItems } = await import(
        '@/app/_server/actions/checklist-item/bulk-operations'
      )

      const results = [
        await updateItemStatus(
          createFormData({ uuid: 'list-uuid', itemId: 'milk', status: 'completed', username: VICTIM }),
        ),
        await bulkToggleItems(
          createFormData({ uuid: 'list-uuid', itemIds: '["milk"]', completed: 'true', username: VICTIM }),
        ),
        await bulkDeleteItems(
          createFormData({ uuid: 'list-uuid', itemIds: '["milk"]', username: VICTIM }),
        ),
      ]

      for (const result of results) {
        expect(result).toEqual({ success: false, error: 'Not authenticated' })
      }
      expect(mockWrite).not.toHaveBeenCalled()
    })

    it('updateList and deleteList ignore a forged apiUser blob', async () => {
      const { updateList, deleteList } = await import('@/app/_server/actions/checklist/crud')
      const apiUser = JSON.stringify({ username: VICTIM })

      const updated = await updateList(
        createFormData({ uuid: 'list-uuid', title: 'pwned', category: 'Personal', apiUser }),
      )
      const deleted = await deleteList(createFormData({ uuid: 'list-uuid', apiUser }))

      expect(updated.error).toBe('Not authenticated')
      expect(deleted.error).toBe('Not authenticated')
      expect(mockWrite).not.toHaveBeenCalled()
      expect(mockDelete).not.toHaveBeenCalled()
    })
  })

  describe('with a session for somebody else', () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({ username: MALLORY })
    })

    it('refuses item actions that claim a different user', async () => {
      const { updateItem, createItem } = await import('@/app/_server/actions/checklist-item/crud')
      const { updateItemStatus } = await import('@/app/_server/actions/checklist-item/status')

      const results = [
        await updateItem(victimList() as any, createFormData({ itemId: 'milk', completed: 'true' }), VICTIM),
        await createItem(victimList() as any, createFormData({ text: 'pwned' }), VICTIM),
        await updateItemStatus(
          createFormData({ uuid: 'list-uuid', itemId: 'milk', status: 'completed', username: VICTIM }),
        ),
      ]

      for (const result of results) {
        expect(result).toEqual({ success: false, error: 'Identity mismatch' })
      }
      expect(mockWrite).not.toHaveBeenCalled()
    })

    it('updateNote checks permission for the session user, not the FormData user', async () => {
      const { updateNote } = await import('@/app/_server/actions/note/crud')

      const result = await updateNote(
        createFormData({ uuid: 'note-uuid', title: 'Diary', content: 'pwned', user: VICTIM }),
      )

      expect(result.error).toBe('Permission denied')
      expect(actorsAsked()).toEqual([MALLORY])
      expect(mockWrite).not.toHaveBeenCalled()
    })
  })

  describe('API key routes still act as the key owner', () => {
    beforeEach(() => {
      mockAuthenticateApiKey.mockResolvedValue({ username: VICTIM, isAdmin: false })
    })

    it('PUT /api/notes/:id updates the note as the API key user', async () => {
      const { PUT } = await import('@/app/api/notes/[noteId]/route')

      const response = await PUT(
        apiRequest('PUT', '/api/notes/note-uuid', { content: 'from a shortcut' }),
        { params: Promise.resolve({ noteId: 'note-uuid' }) },
      )
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.content).toBe('from a shortcut')
      expect(mockWrite).toHaveBeenCalledOnce()
      expect(new Set(actorsAsked())).toEqual(new Set([VICTIM]))
    })

    it('PUT /api/checklists/:id/items/:index/check ticks the item as the API key user', async () => {
      const { PUT } = await import('@/app/api/checklists/[listId]/items/[itemIndex]/check/route')

      const response = await PUT(
        apiRequest('PUT', '/api/checklists/list-uuid/items/0/check'),
        { params: Promise.resolve({ listId: 'list-uuid', itemIndex: '0' }) },
      )

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ success: true })
      expect(mockWrite).toHaveBeenCalledOnce()
      expect(new Set(actorsAsked())).toEqual(new Set([VICTIM]))
    })
  })
})
