import { describe, it, expect, beforeEach, vi } from 'vitest'
import path from 'path'
import { resetAllMocks, mockFs } from '../setup'
import { Modes } from '@/app/_types/enums'

const VICTIM = 'victim'
const MALLORY = 'mallory'
const READER = 'reader'
const NOTE_UUID = '6f1c2b4e-8a3d-4c5e-9f10-2b3c4d5e6f70'
const LIST_UUID = '7a2d3c5f-9b4e-4d6f-8a21-3c4d5e6f7081'

const homeOf = (mode: Modes, username: string) =>
  path.join(process.cwd(), 'data', mode, username)

const NOTE_PATH = path.join(homeOf(Modes.NOTES, VICTIM), 'Personal', 'diary.md')
const LIST_PATH = path.join(homeOf(Modes.CHECKLISTS, VICTIM), 'Personal', 'shopping.md')

const FILES: Record<string, string> = {
  [NOTE_PATH]: `---\nuuid: ${NOTE_UUID}\ntitle: Diary\n---\n\ndear diary`,
  [LIST_PATH]: `---\nuuid: ${LIST_UUID}\ntitle: Shopping\n---\n\n- [ ] Milk`,
}

const mockGetCurrentUser = vi.fn()
const mockGrepFind = vi.fn()
const mockReaders = vi.fn()
const mockCanAccessAll = vi.fn()

const readers = (): string[] => mockReaders() || []
const mayRead = (username: string) =>
  username === VICTIM || readers().includes(username)

vi.mock('@/app/_server/actions/users', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  getUsername: async () => (await mockGetCurrentUser())?.username || '',
  getUserByNoteUuid: async () => ({ success: true, data: { username: VICTIM } }),
  getUserByChecklistUuid: async () => ({ success: true, data: { username: VICTIM } }),
}))

vi.mock('@/app/_utils/grep-utils', () => ({
  grepFindFileByUuid: (...args: unknown[]) => mockGrepFind(...args),
}))

vi.mock('@/app/_server/actions/file', () => ({
  serverReadFile: async (filePath: string) => FILES[filePath] || '',
  serverReadExisting: async (filePath: string) => FILES[filePath] ?? null,
  readJsonFile: vi.fn().mockResolvedValue([]),
  ensureDir: vi.fn(),
  getUserModeDir: vi.fn(),
}))

vi.mock('@/app/_server/actions/share/mounts', () => ({
  mountsFor: async (_mode: Modes, username: string) =>
    readers().includes(username) ? [{ owner: VICTIM }] : [],
  mountedItems: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/app/_server/actions/share/access', () => ({
  canReachFile: async (_mode: Modes, _file: string, username: string) =>
    mayRead(username),
}))

vi.mock('@/app/_server/actions/share/queries', () => ({
  canReach: async (_uuid: string, _type: string, username: string) =>
    Boolean(username) && ((await mockCanAccessAll()) || mayRead(username)),
}))

vi.mock('@/app/_server/actions/lib/metadata-cache', () => ({
  getOrCompute: vi.fn(),
  metaCacheKey: vi.fn(),
}))

const signIn = (username: string | null) =>
  mockGetCurrentUser.mockResolvedValue(
    username ? { username, isAdmin: false } : null,
  )

describe('Security: client reads by uuid are gated by the session', () => {
  beforeEach(() => {
    resetAllMocks()
    mockReaders.mockReturnValue([])
    mockCanAccessAll.mockResolvedValue(false)
    mockFs.stat.mockResolvedValue({ birthtime: new Date(0), mtime: new Date(0) })
    mockGrepFind.mockImplementation(async (dir: string, uuid: string) => {
      if (dir === homeOf(Modes.NOTES, VICTIM) && uuid === NOTE_UUID) {
        return { filePath: NOTE_PATH, id: 'diary', category: 'Personal' }
      }
      if (dir === homeOf(Modes.CHECKLISTS, VICTIM) && uuid === LIST_UUID) {
        return { filePath: LIST_PATH, id: 'shopping', category: 'Personal' }
      }
      return null
    })
  })

  describe('without a session', () => {
    beforeEach(() => signIn(null))

    it('viewNote refuses and never touches the disk', async () => {
      const { viewNote } = await import('@/app/_server/actions/note')

      expect(await viewNote(NOTE_UUID)).toBeUndefined()
      expect(mockGrepFind).not.toHaveBeenCalled()
    })

    it('viewList refuses and never touches the disk', async () => {
      const { viewList } = await import('@/app/_server/actions/checklist')

      expect(await viewList(LIST_UUID)).toBeUndefined()
      expect(mockGrepFind).not.toHaveBeenCalled()
    })
  })

  describe('a signed-in user sending something that is not a uuid', () => {
    beforeEach(() => signIn(MALLORY))

    it('is refused before any lookup runs', async () => {
      const { viewNote } = await import('@/app/_server/actions/note')
      const { viewList } = await import('@/app/_server/actions/checklist')

      expect(await viewNote('x$(touch /tmp/pwn)')).toBeUndefined()
      expect(await viewList('x`touch /tmp/pwn`')).toBeUndefined()
      expect(mockGrepFind).not.toHaveBeenCalled()
    })
  })

  describe('a stranger with the uuid', () => {
    beforeEach(() => signIn(MALLORY))

    it('cannot read an unshared note', async () => {
      const { viewNote } = await import('@/app/_server/actions/note')

      expect(await viewNote(NOTE_UUID)).toBeUndefined()
    })

    it('cannot read an unshared checklist', async () => {
      const { viewList } = await import('@/app/_server/actions/checklist')

      expect(await viewList(LIST_UUID)).toBeUndefined()
    })

    it('cannot borrow the owner name by sending it along', async () => {
      const { viewNote } = await import('@/app/_server/actions/note')
      const { viewList } = await import('@/app/_server/actions/checklist')
      const spoofNote = viewNote as unknown as (uuid: string, as: string) => ReturnType<typeof viewNote>
      const spoofList = viewList as unknown as (uuid: string, as: string) => ReturnType<typeof viewList>

      expect(await spoofNote(NOTE_UUID, VICTIM)).toBeUndefined()
      expect(await spoofList(LIST_UUID, VICTIM)).toBeUndefined()
    })
  })

  describe('a user holding a READ share', () => {
    beforeEach(() => {
      signIn(READER)
      mockReaders.mockReturnValue([READER])
    })

    it('can read the shared note', async () => {
      const { viewNote } = await import('@/app/_server/actions/note')

      const note = await viewNote(NOTE_UUID)

      expect(note?.content).toContain('dear diary')
      expect(note?.owner).toBe(VICTIM)
      expect(note?.isShared).toBe(true)
    })

    it('can read the shared checklist', async () => {
      const { viewList } = await import('@/app/_server/actions/checklist')

      const list = await viewList(LIST_UUID)

      expect(list?.items.map((item) => item.text)).toEqual(['Milk'])
      expect(list?.owner).toBe(VICTIM)
      expect(list?.isShared).toBe(true)
    })
  })

  describe('the owner', () => {
    beforeEach(() => signIn(VICTIM))

    it('can read their note', async () => {
      const { viewNote } = await import('@/app/_server/actions/note')

      const note = await viewNote(NOTE_UUID)

      expect(note?.title).toBe('Diary')
      expect(note?.owner).toBe(VICTIM)
      expect(note?.isShared).toBe(false)
    })

    it('can read their checklist', async () => {
      const { viewList } = await import('@/app/_server/actions/checklist')

      const list = await viewList(LIST_UUID)

      expect(list?.title).toBe('Shopping')
      expect(list?.owner).toBe(VICTIM)
      expect(list?.isShared).toBe(false)
    })
  })

  describe('an admin allowed to see all content', () => {
    beforeEach(() => {
      signIn(MALLORY)
      mockCanAccessAll.mockResolvedValue(true)
    })

    it('reads through the permission check, not around it', async () => {
      const { viewNote } = await import('@/app/_server/actions/note')

      expect((await viewNote(NOTE_UUID))?.owner).toBe(VICTIM)
    })
  })
})
