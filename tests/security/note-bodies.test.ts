import { describe, it, expect, beforeEach, vi } from 'vitest'
import path from 'path'
import { resetAllMocks, mockFs } from '../setup'
import { Modes } from '@/app/_types/enums'
import { MAX_BODY_BATCH } from '@/app/_consts/browse'

const VICTIM = 'victim'
const MALLORY = 'mallory'
const READER = 'reader'
const DIARY = '6f1c2b4e-8a3d-4c5e-9f10-2b3c4d5e6f70'
const SEALED = '6f1c2b4e-8a3d-4c5e-9f10-2b3c4d5e6f71'
const MINE = '6f1c2b4e-8a3d-4c5e-9f10-2b3c4d5e6f72'
const UNKNOWN = '6f1c2b4e-8a3d-4c5e-9f10-2b3c4d5e6f73'
const CIPHER = '-----BEGIN PGP MESSAGE-----\nwcBMA\n-----END PGP MESSAGE-----'

const homeOf = (username: string) => path.join(process.cwd(), 'data', Modes.NOTES, username)

const FILES: Record<string, { owner: string; uuid: string; raw: string }> = {
  [path.join(homeOf(VICTIM), 'Personal', 'diary.md')]: {
    owner: VICTIM,
    uuid: DIARY,
    raw: `---\nuuid: ${DIARY}\ntitle: Diary\n---\n\ndear diary`,
  },
  [path.join(homeOf(VICTIM), 'Personal', 'sealed.md')]: {
    owner: VICTIM,
    uuid: SEALED,
    raw: `---\nuuid: ${SEALED}\ntitle: Sealed\nencrypted: true\nencryptionMethod: pgp\n---\n${CIPHER}`,
  },
  [path.join(homeOf(MALLORY), 'Mine', 'mine.md')]: {
    owner: MALLORY,
    uuid: MINE,
    raw: `---\nuuid: ${MINE}\ntitle: Mine\n---\n\nmallory owns this`,
  },
}

const mockGetCurrentUser = vi.fn()
const mockGrepFind = vi.fn()
const mockReaders = vi.fn()

const readers = (): string[] => mockReaders() || []
const mayRead = (owner: string, username: string) =>
  username === owner || (owner === VICTIM && readers().includes(username))

vi.mock('@/app/_server/actions/users', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  getUsername: async () => (await mockGetCurrentUser())?.username || '',
  getUserByNoteUuid: async (uuid: string) => {
    const hit = Object.values(FILES).find((file) => file.uuid === uuid)
    return hit ? { success: true, data: { username: hit.owner } } : { success: false }
  },
}))

vi.mock('@/app/_utils/grep-utils', () => ({
  grepFindFileByUuid: (...args: unknown[]) => mockGrepFind(...args),
}))

vi.mock('@/app/_server/actions/file', () => ({
  serverReadFile: async (filePath: string) => FILES[filePath]?.raw || '',
  serverReadExisting: async (filePath: string) => FILES[filePath]?.raw ?? null,
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
  canReachFile: async (_mode: Modes, file: string, username: string) =>
    Boolean(FILES[file]) && mayRead(FILES[file].owner, username),
}))

vi.mock('@/app/_server/actions/share/queries', () => ({
  canReach: async (uuid: string, _type: string, username: string) => {
    const hit = Object.values(FILES).find((file) => file.uuid === uuid)
    return Boolean(hit) && mayRead(hit!.owner, username)
  },
}))

vi.mock('@/app/_server/actions/lib/metadata-cache', () => ({
  getOrCompute: vi.fn(),
  metaCacheKey: vi.fn(),
  summaryCacheKey: vi.fn(),
}))

const signIn = (username: string | null) =>
  mockGetCurrentUser.mockResolvedValue(username ? { username, isAdmin: false } : null)

const bodiesOf = async (uuids: string[]) => {
  const { readNoteBodies } = await import('@/app/_server/actions/note')
  return readNoteBodies(uuids)
}

describe('Security: batch note body reads are gated per uuid by the session', () => {
  beforeEach(() => {
    resetAllMocks()
    mockReaders.mockReturnValue([])
    mockFs.stat.mockResolvedValue({ birthtime: new Date(0), mtime: new Date(0) })
    mockGrepFind.mockImplementation(async (dir: string, uuid: string) => {
      const hit = Object.entries(FILES).find(
        ([filePath, file]) => file.uuid === uuid && filePath.startsWith(dir + path.sep),
      )
      if (!hit) return null
      const relative = path.relative(dir, hit[0])
      return { filePath: hit[0], id: path.basename(relative, '.md'), category: path.dirname(relative) }
    })
  })

  it('refuses without a session and never touches the disk', async () => {
    signIn(null)

    const result = await bodiesOf([DIARY])

    expect(result.success).toBe(false)
    expect(result.data).toBeUndefined()
    expect(mockGrepFind).not.toHaveBeenCalled()
  })

  it('refuses an oversized batch before any lookup runs', async () => {
    signIn(VICTIM)

    const result = await bodiesOf(Array.from({ length: MAX_BODY_BATCH + 1 }, () => DIARY))

    expect(result.success).toBe(false)
    expect(mockGrepFind).not.toHaveBeenCalled()
  })

  it('accepts a batch at the cap', async () => {
    signIn(VICTIM)

    const result = await bodiesOf(Array.from({ length: MAX_BODY_BATCH }, () => DIARY))

    expect(result.success).toBe(true)
    expect(result.data).toEqual([{ uuid: DIARY, content: 'dear diary' }])
  })

  it('omits another user\'s note exactly like an unknown uuid', async () => {
    signIn(MALLORY)

    const forbidden = await bodiesOf([DIARY])
    const unknown = await bodiesOf([UNKNOWN])

    expect(forbidden).toEqual({ success: true, data: [] })
    expect(unknown).toEqual(forbidden)
  })

  it('cannot borrow the owner name by sending it along', async () => {
    signIn(MALLORY)
    const { readNoteBodies } = await import('@/app/_server/actions/note')
    const spoof = readNoteBodies as unknown as (uuids: string[], as: string) => ReturnType<typeof readNoteBodies>

    expect(await spoof([DIARY], VICTIM)).toEqual({ success: true, data: [] })
  })

  it('returns a shared note to a reader with a READ grant', async () => {
    signIn(READER)
    mockReaders.mockReturnValue([READER])

    const result = await bodiesOf([DIARY])

    expect(result.data).toEqual([{ uuid: DIARY, content: 'dear diary' }])
  })

  it('returns nothing to the same user once the grant is gone', async () => {
    signIn(READER)

    expect(await bodiesOf([DIARY])).toEqual({ success: true, data: [] })
  })

  it('hands back encrypted notes as stored ciphertext, never decrypted', async () => {
    signIn(VICTIM)

    const result = await bodiesOf([SEALED])

    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].content).toContain('-----BEGIN PGP MESSAGE-----')
    expect(result.data?.[0].content.trim()).toBe(CIPHER)
  })

  it('serves a mixed batch with only the bodies the caller may read', async () => {
    signIn(MALLORY)

    const result = await bodiesOf([
      MINE,
      DIARY,
      UNKNOWN,
      'x$(touch /tmp/pwn)',
      '../../etc/passwd',
      MINE,
      42 as unknown as string,
    ])

    expect(result).toEqual({ success: true, data: [{ uuid: MINE, content: 'mallory owns this' }] })
    const looked = mockGrepFind.mock.calls.map(([, uuid]) => uuid)
    expect(looked).not.toContain('x$(touch /tmp/pwn)')
    expect(looked).not.toContain('../../etc/passwd')
  })

  it('refuses something that is not a list', async () => {
    signIn(VICTIM)
    const { readNoteBodies } = await import('@/app/_server/actions/note')
    const loose = readNoteBodies as unknown as (uuids: unknown) => ReturnType<typeof readNoteBodies>

    expect((await loose(DIARY)).success).toBe(false)
    expect((await loose({ length: 1, 0: DIARY })).success).toBe(false)
  })
})
