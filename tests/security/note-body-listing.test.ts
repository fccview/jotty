import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllMocks } from '../setup'
import { Modes, PermissionTypes } from '@/app/_types/enums'

const OWN = '7a1c2b4e-8a3d-4c5e-9f10-2b3c4d5e6f70'
const SHARED = '7a1c2b4e-8a3d-4c5e-9f10-2b3c4d5e6f71'
const LOCKED_OUT = '7a1c2b4e-8a3d-4c5e-9f10-2b3c4d5e6f72'
const ARCHIVED = '7a1c2b4e-8a3d-4c5e-9f10-2b3c4d5e6f73'

const mockGetCurrentUser = vi.fn()
const mockGetUserNotes = vi.fn()
const mockGetNoteById = vi.fn()
const mockCanReach = vi.fn()
const mockCanReachFile = vi.fn()

vi.mock('@/app/_server/actions/users', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}))

vi.mock('@/app/_server/actions/note/queries', () => ({
  getUserNotes: (...args: unknown[]) => mockGetUserNotes(...args),
  getNoteById: (...args: unknown[]) => mockGetNoteById(...args),
}))

vi.mock('@/app/_server/actions/share/queries', () => ({
  canReach: (...args: unknown[]) => mockCanReach(...args),
}))

vi.mock('@/app/_server/actions/share/access', () => ({
  canReachFile: (...args: unknown[]) => mockCanReachFile(...args),
}))

const listed = (uuid: string, content: string, extra: Record<string, unknown> = {}) => ({
  id: uuid,
  uuid,
  title: uuid,
  content,
  createdAt: '',
  updatedAt: '',
  sourcePath: `/data/notes/${uuid}.md`,
  ...extra,
})

const LISTING = [
  listed(OWN, 'mine'),
  listed(SHARED, 'shared body', { isShared: true, sourcePath: '/data/notes/victim/shared.md' }),
  listed(LOCKED_OUT, 'not for you', { isShared: true, sourcePath: '/data/notes/victim/locked.md' }),
]

const bodiesOf = async (uuids: string[]) => {
  const { readNoteBodies } = await import('@/app/_server/actions/note/viewer')
  return readNoteBodies(uuids)
}

describe('Security: batch note bodies resolved from the listing', () => {
  beforeEach(() => {
    resetAllMocks()
    mockGetCurrentUser.mockResolvedValue({ username: 'reader', isAdmin: false })
    mockGetUserNotes.mockImplementation(async ({ bodiesFor }: { bodiesFor: (notes: unknown[]) => string[] }) => {
      const wanted = new Set(bodiesFor(LISTING))
      return {
        success: true,
        data: LISTING.map((note) => (wanted.has(note.uuid) ? note : { ...note, content: '', excerpt: 'x' })),
      }
    })
    mockGetNoteById.mockResolvedValue(undefined)
    mockCanReach.mockResolvedValue(false)
    mockCanReachFile.mockImplementation(async (_mode: string, file: string) => file.endsWith('shared.md'))
  })

  it('reads listed notes without a per-uuid tree grep', async () => {
    const result = await bodiesOf([OWN, SHARED])

    expect(result).toEqual({
      success: true,
      data: [
        { uuid: OWN, content: 'mine' },
        { uuid: SHARED, content: 'shared body' },
      ],
    })
    expect(mockGetNoteById).not.toHaveBeenCalled()
    expect(mockGetUserNotes).toHaveBeenCalledTimes(1)
    expect(mockGetUserNotes).toHaveBeenCalledWith(expect.objectContaining({ username: 'reader', summarize: true }))
  })

  it('still checks READ on the file for mounted notes and hides a refusal like an unknown uuid', async () => {
    const result = await bodiesOf([LOCKED_OUT])

    expect(result).toEqual({ success: true, data: [] })
    expect(mockCanReachFile).toHaveBeenCalledWith(Modes.NOTES, '/data/notes/victim/locked.md', 'reader', PermissionTypes.READ)
  })

  it('falls back to the uuid lookup for notes the listing does not hold', async () => {
    mockGetNoteById.mockImplementation(async (uuid: string, username?: string) =>
      username === 'reader' && uuid === ARCHIVED ? { uuid, content: 'archived body' } : undefined,
    )

    const result = await bodiesOf([ARCHIVED])

    expect(result.data).toEqual([{ uuid: ARCHIVED, content: 'archived body' }])
    expect(mockGetNoteById).toHaveBeenCalledWith(ARCHIVED, 'reader')
  })

  it('falls back to the uuid lookup when the listing fails', async () => {
    mockGetUserNotes.mockResolvedValue({ success: false, error: 'boom' })
    mockGetNoteById.mockImplementation(async (uuid: string, username?: string) =>
      username === 'reader' ? { uuid, content: 'from disk' } : undefined,
    )

    const result = await bodiesOf([OWN])

    expect(result.data).toEqual([{ uuid: OWN, content: 'from disk' }])
  })

  it('never lists anything without a session', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await bodiesOf([OWN])

    expect(result.success).toBe(false)
    expect(mockGetUserNotes).not.toHaveBeenCalled()
  })
})
