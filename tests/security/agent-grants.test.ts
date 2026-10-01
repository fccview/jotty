import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { resetAllMocks } from '../setup'
import { ItemTypes, PermissionTypes } from '@/app/_types/enums'
import {
  INVALID_AGENT,
  SPEC_ENCRYPTED,
  SPEC_MISSING,
  SpecStatus,
} from '@/app/_consts/agents'

const OWNER = 'owner'
const EDITOR = 'editor'
const READER = 'reader'
const BLIND = 'blind'
const STRANGER = 'stranger'

const BOARD_UUID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
const SPEC_UUID = '2b3c4d5e-6f70-4b8c-9d0e-1f2a3b4c5d6e'
const SECRET_UUID = '3c4d5e6f-7081-4c9d-8e1f-2a3b4c5d6e7f'
const GONE_UUID = '4d5e6f70-8192-4dae-9f20-3b4c5d6e7f80'
const BOARD_PATH = '/data/checklists/owner/Work/board.md'
const SPEC_PATH = '/data/notes/owner/Plans/spec.md'
const SECRET_PATH = '/data/notes/owner/Plans/secret.md'
const CIPHER = '-----BEGIN PGP MESSAGE-----\nhQEMA-agents-are-in-here\n-----END PGP MESSAGE-----'

const SPEC_BODY = [
  '---',
  `uuid: ${SPEC_UUID}`,
  'title: Spec',
  '---',
  '## Agents',
  '- `parser-bot` - tokenizer',
  '## Progress',
  '- card: parser-bot started',
].join('\n')

const SECRET_BODY = [
  '---',
  `uuid: ${SECRET_UUID}`,
  'title: Secret spec',
  'encrypted: true',
  'encryptionMethod: pgp',
  '---',
  CIPHER,
].join('\n')

const BOARD_GRANTS: Record<string, PermissionTypes[]> = {
  [OWNER]: [PermissionTypes.READ, PermissionTypes.EDIT, PermissionTypes.CREATE, PermissionTypes.DELETE],
  [EDITOR]: [PermissionTypes.READ, PermissionTypes.EDIT],
  [BLIND]: [PermissionTypes.READ, PermissionTypes.EDIT],
  [READER]: [PermissionTypes.READ],
}

const NOTE_GRANTS: Record<string, PermissionTypes[]> = {
  [OWNER]: [PermissionTypes.READ, PermissionTypes.EDIT],
  [EDITOR]: [PermissionTypes.READ],
  [READER]: [PermissionTypes.READ],
}

const NOTE_PATHS: Record<string, string> = { [SPEC_UUID]: SPEC_PATH, [SECRET_UUID]: SECRET_PATH }
const NOTE_BODIES: Record<string, string> = { [SPEC_PATH]: SPEC_BODY, [SECRET_PATH]: SECRET_BODY }

const pin = vi.hoisted(() => ({ current: '' as string | undefined }))
const mockAuthenticateApiKey = vi.fn()
const mockWrite = vi.fn()
const mockNotify = vi.fn()
const mockFindUser = vi.fn()
const mockBroadcast = vi.fn()

const holds = (grants: Record<string, PermissionTypes[]>, username: string, permission: PermissionTypes) =>
  (grants[username] || []).includes(permission)

const pathFor = (uuid: string, type: string, username: string, permission: PermissionTypes) => {
  if (type === ItemTypes.CHECKLIST) return holds(BOARD_GRANTS, username, permission) ? BOARD_PATH : null
  return NOTE_PATHS[uuid] && holds(NOTE_GRANTS, username, permission) ? NOTE_PATHS[uuid] : null
}

const ownerBoard = () => ({
  uuid: BOARD_UUID,
  id: 'board',
  title: 'Board',
  category: 'Work',
  owner: OWNER,
  type: 'kanban',
  ...(pin.current && { specNote: pin.current }),
  items: [{ id: 'card', text: 'Card', completed: false, order: 0, status: 'todo', assignee: READER }],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

vi.mock('@/app/_server/actions/users', () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
  getUsername: vi.fn().mockResolvedValue(''),
  isAdmin: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/app/_server/actions/users/records', () => ({
  findUserRecord: (...args: unknown[]) => mockFindUser(...args),
}))

vi.mock('@/app/_server/actions/file', () => ({
  ensureDir: vi.fn(),
  getUserModeDir: vi.fn(),
  serverWriteFile: (...args: unknown[]) => mockWrite(...args),
  serverReadFile: async (filePath: string) => NOTE_BODIES[filePath] || '',
}))

vi.mock('@/app/_server/actions/checklist/queries', () => ({
  getListById: async (_uuid: string, username?: string) =>
    !username || BOARD_GRANTS[username] ? ownerBoard() : undefined,
  getUserChecklists: async ({ username }: { username: string }) => ({
    success: true,
    data: BOARD_GRANTS[username] ? [{ ...ownerBoard(), items: [{ ...ownerBoard().items[0], agent: 'parser-bot' }] }] : [],
  }),
}))

vi.mock('@/app/_server/actions/share/queries', () => ({
  canReach: async (uuid: string, type: string, username: string, permission: PermissionTypes) =>
    pathFor(uuid, type, username, permission) !== null,
  reachableFile: async (uuid: string, type: string, username: string, permission: PermissionTypes) =>
    pathFor(uuid, type, username, permission),
}))

vi.mock('@/app/_server/actions/ws/broadcast', () => ({
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}))

vi.mock('@/app/_server/actions/notifications/internal', () => ({
  notifyUser: (...args: unknown[]) => mockNotify(...args),
}))

vi.mock('@/app/_server/actions/api/authenticate', () => ({
  authenticateApiKey: (...args: unknown[]) => mockAuthenticateApiKey(...args),
}))

vi.mock('@/app/_server/actions/lib/legacy-lookup', () => ({
  resolveApiId: async (_mode: string, param: string) => param,
}))

const keyFor = (username: string) => mockAuthenticateApiKey.mockResolvedValue({ username, isAdmin: false })

const apiRequest = (method: string, url: string, body?: unknown) =>
  new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'some-key' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

const BASE = `/api/kanban/${BOARD_UUID}`
const onBoard = () => ({ params: Promise.resolve({ boardId: BOARD_UUID }) })
const onCard = () => ({ params: Promise.resolve({ boardId: BOARD_UUID, itemId: 'card' }) })

const assign = async (agent: string | null) => {
  const { PUT } = await import('@/app/api/kanban/[boardId]/items/[itemId]/agent/route')
  return PUT(apiRequest('PUT', `${BASE}/items/card/agent`, { agent }), onCard())
}

const pinSpec = async (noteId: string | null) => {
  const { PUT } = await import('@/app/api/kanban/[boardId]/spec/route')
  return PUT(apiRequest('PUT', `${BASE}/spec`, { noteId }), onBoard())
}

const context = async () => {
  const { GET } = await import('@/app/api/kanban/[boardId]/items/[itemId]/context/route')
  return GET(apiRequest('GET', `${BASE}/items/card/context`), onCard())
}

const tasks = async (query = '') => {
  const { GET } = await import('@/app/api/agents/tasks/route')
  return GET(apiRequest('GET', `/api/agents/tasks${query}`))
}

const errorOf = async (response: Response) => (await response.json()).error

describe('Security: virtual agents and board specs', () => {
  beforeEach(() => {
    resetAllMocks()
    pin.current = SPEC_UUID
    mockAuthenticateApiKey.mockResolvedValue(null)
    mockWrite.mockResolvedValue(undefined)
  })

  describe('a stranger holding the board uuid', () => {
    beforeEach(() => keyFor(STRANGER))

    it('gets 404 everywhere and sees no agent tasks', async () => {
      expect((await assign('parser-bot')).status).toBe(404)
      expect((await pinSpec(SPEC_UUID)).status).toBe(404)
      expect((await context()).status).toBe(404)
      expect((await (await tasks()).json()).tasks).toEqual([])
      expect((await (await tasks(`?boardId=${BOARD_UUID}`)).json()).tasks).toEqual([])
      expect(mockWrite).not.toHaveBeenCalled()
    })
  })

  describe('a reader', () => {
    beforeEach(() => keyFor(READER))

    it('cannot assign an agent or pin a spec', async () => {
      expect((await assign('parser-bot')).status).toBe(403)
      expect((await assign(null)).status).toBe(403)
      expect((await pinSpec(SPEC_UUID)).status).toBe(403)
      expect(mockWrite).not.toHaveBeenCalled()
    })

    it('can read the task context', async () => {
      const response = await context()
      const { data } = await response.json()

      expect(response.status).toBe(200)
      expect(data.spec.status).toBe(SpecStatus.LINKED)
      expect(data.spec.agents).toEqual([{ id: 'parser-bot', role: 'tokenizer' }])
    })

    it('is refused by the server action too, before any spec read', async () => {
      const { assignAgent } = await import('@/app/_server/actions/kanban/agents')
      const reader = { username: READER, isAdmin: false } as Parameters<typeof assignAgent>[0]

      expect(await assignAgent(reader, BOARD_UUID, 'card', 'parser-bot')).toEqual({
        success: false,
        error: 'Permission denied',
      })
      expect(mockWrite).not.toHaveBeenCalled()
    })
  })

  describe('an editor who can read the spec', () => {
    beforeEach(() => keyFor(EDITOR))

    it('assigns an indexed agent without touching users or the human assignee', async () => {
      const response = await assign(' Parser-Bot ')
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.item).toMatchObject({ agent: 'parser-bot', assignee: READER })
      expect(mockWrite).toHaveBeenCalledOnce()
      expect(mockWrite.mock.calls[0][0]).toBe(BOARD_PATH)
      expect(mockBroadcast).toHaveBeenCalledWith(expect.objectContaining({ type: 'checklist', entityId: BOARD_UUID }))
      expect(mockNotify).not.toHaveBeenCalled()
      expect(mockFindUser).not.toHaveBeenCalled()
    })

    it('assigns an agent the spec does not list', async () => {
      const response = await assign('ghost-bot')

      expect(response.status).toBe(200)
      expect((await response.json()).item).toMatchObject({ agent: 'ghost-bot' })
      expect(mockWrite).toHaveBeenCalledOnce()
    })

    it.each([
      ['an id with a pipe in it', 'bad | agent:x', INVALID_AGENT],
      ['an id that walks out of a folder', '../owner', INVALID_AGENT],
    ])('refuses %s with 400 and writes nothing', async (_label, agent, message) => {
      const response = await assign(agent)

      expect(response.status).toBe(400)
      expect(await errorOf(response)).toBe(message)
      expect(mockWrite).not.toHaveBeenCalled()
    })

    it('can always clear the agent', async () => {
      pin.current = undefined

      const response = await assign(null)

      expect(response.status).toBe(200)
      expect(mockWrite).toHaveBeenCalledOnce()
    })

    it('sets one on a board without a pinned spec', async () => {
      pin.current = undefined

      const response = await assign('parser-bot')

      expect(response.status).toBe(200)
      expect(mockWrite).toHaveBeenCalledOnce()
    })
  })

  describe('an editor who cannot read the spec note', () => {
    beforeEach(() => keyFor(BLIND))

    it('assigns the same way whether the spec is unreadable or gone', async () => {
      const unreadable = await assign('parser-bot')
      pin.current = GONE_UUID
      const gone = await assign('parser-bot')

      expect([unreadable.status, gone.status]).toEqual([200, 200])
      expect(JSON.stringify(await unreadable.json())).not.toContain('tokenizer')
    })

    it('cannot pin a note it cannot read, and learns nothing about it', async () => {
      const unreadable = await pinSpec(SPEC_UUID)
      const gone = await pinSpec(GONE_UUID)

      expect(await errorOf(unreadable)).toBe(SPEC_MISSING)
      expect(await errorOf(gone)).toBe(SPEC_MISSING)
      expect(mockWrite).not.toHaveBeenCalled()
    })

    it('gets a context without any of the spec', async () => {
      const { data } = await (await context()).json()

      expect(data.spec).toEqual({
        status: SpecStatus.MISSING,
        agents: [],
        progress: [],
        blockers: [],
        handover: [],
        truncated: false,
      })
      expect(JSON.stringify(data)).not.toContain('tokenizer')
    })
  })

  describe('encrypted spec notes', () => {
    beforeEach(() => keyFor(OWNER))

    it('cannot be pinned', async () => {
      const response = await pinSpec(SECRET_UUID)

      expect(response.status).toBe(400)
      expect(await errorOf(response)).toBe(SPEC_ENCRYPTED)
      expect(mockWrite).not.toHaveBeenCalled()
    })

    it('stay opaque when a board already points at one', async () => {
      pin.current = SECRET_UUID

      const { data } = await (await context()).json()

      expect(data.spec.status).toBe(SpecStatus.ENCRYPTED)
      expect(data.spec.note).toBeUndefined()
      expect(JSON.stringify(data)).not.toContain('agents-are-in-here')
      expect(mockWrite).not.toHaveBeenCalled()
    })
  })

  describe('the owner pinning a readable spec', () => {
    beforeEach(() => keyFor(OWNER))

    it('writes the board file and returns the agent index', async () => {
      const response = await pinSpec(SPEC_UUID)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data).toEqual({
        boardId: BOARD_UUID,
        specNote: SPEC_UUID,
        status: SpecStatus.LINKED,
        agents: [{ id: 'parser-bot', role: 'tokenizer' }],
      })
      expect(mockWrite).toHaveBeenCalledOnce()
      expect(mockWrite.mock.calls[0][0]).toBe(BOARD_PATH)
    })

    it('refuses a spec id that is not a uuid', async () => {
      const response = await pinSpec('../../users/users.json')

      expect(response.status).toBe(400)
      expect(mockWrite).not.toHaveBeenCalled()
    })
  })
})
