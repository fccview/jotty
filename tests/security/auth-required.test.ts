import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllMocks, createFormData } from '../setup'

const mockGetCurrentUser = vi.fn()
const mockGetSessionId = vi.fn()
const mockReadSessions = vi.fn()
const mockGetUsername = vi.fn()
const mockIsAuthenticated = vi.fn()

vi.mock('@/app/_server/actions/users', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    getCurrentUser: () => mockGetCurrentUser(),
    getUsername: () => mockGetUsername(),
    isAuthenticated: () => mockIsAuthenticated(),
    isAdmin: vi.fn().mockResolvedValue(false),
    getUserByUsername: vi.fn().mockResolvedValue(null),
    getUserByNote: vi.fn().mockResolvedValue({ success: false }),
    getUserByChecklist: vi.fn().mockResolvedValue({ success: false }),
    getUserByNoteUuid: vi.fn().mockResolvedValue({ success: false }),
    getUserByChecklistUuid: vi.fn().mockResolvedValue({ success: false }),
  }
})

vi.mock('@/app/_server/actions/session', () => ({
  getSessionId: () => mockGetSessionId(),
  readSessions: () => mockReadSessions(),
  createSession: vi.fn(),
  removeSession: vi.fn(),
}))

vi.mock('@/app/_server/actions/file', () => ({
  getUserModeDir: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  ensureDir: vi.fn(),
  serverWriteFile: vi.fn(),
  serverDeleteFile: vi.fn(),
  serverReadFile: vi.fn(),
  serverReadDir: vi.fn().mockResolvedValue([]),
  readOrderFile: vi.fn().mockResolvedValue(null),
  readJsonFile: vi.fn().mockResolvedValue([]),
  writeJsonFile: vi.fn(),
}))

vi.mock('@/app/_server/actions/sharing', () => ({
  checkUserPermission: vi.fn().mockResolvedValue(false),
  getAllSharedItemsForUser: vi.fn().mockResolvedValue({ notes: [], checklists: [] }),
}))

vi.mock('@/app/_server/actions/log', () => ({
  logContentEvent: vi.fn(),
  logAudit: vi.fn(),
  logAuthEvent: vi.fn(),
  logUserEvent: vi.fn(),
}))

vi.mock('@/app/_server/actions/link', () => ({
  parseInternalLinks: vi.fn().mockResolvedValue([]),
  updateIndexForItem: vi.fn(),
  removeItemFromIndex: vi.fn(),
}))

vi.mock('@/app/_server/actions/history', () => ({
  commitNote: vi.fn(),
}))

vi.mock('@/app/_server/actions/config', () => ({
  getSettings: vi.fn().mockResolvedValue({}),
}))

describe('Security: Authentication Required', () => {
  beforeEach(() => {
    resetAllMocks()
    mockGetCurrentUser.mockResolvedValue(null)
    mockGetSessionId.mockResolvedValue(null)
    mockReadSessions.mockResolvedValue({})
    mockGetUsername.mockResolvedValue('')
    mockIsAuthenticated.mockResolvedValue(false)
  })

  describe('Note Actions', () => {
    it('createNote should reject unauthenticated requests', async () => {
      const { createNote } = await import('@/app/_server/actions/note')

      const formData = createFormData({
        title: 'Malicious Note',
        category: 'Hacked',
        rawContent: 'Stolen data',
      })

      const result = await createNote(formData)

      expect(result.error).toBe('Not authenticated')
      expect(result.success).toBeUndefined()
    })

    it('deleteNote should reject unauthenticated requests', async () => {
      const { deleteNote } = await import('@/app/_server/actions/note')

      const formData = createFormData({
        id: 'some-note',
        category: 'Category',
      })

      const result = await deleteNote(formData)

      expect(result.error).toBe('Not authenticated')
    })

    it('getUserNotes should reject unauthenticated requests', async () => {
      const { getUserNotes } = await import('@/app/_server/actions/note')

      const result = await getUserNotes()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })
  })

  describe('Checklist Actions', () => {
    it('createList should reject unauthenticated requests', async () => {
      const { createList } = await import('@/app/_server/actions/checklist')

      const formData = createFormData({
        title: 'Malicious List',
        category: 'Hacked',
      })

      const result = await createList(formData)

      expect(result.error).toBeDefined()
    })

    it('deleteList should reject unauthenticated requests', async () => {
      const { deleteList } = await import('@/app/_server/actions/checklist')

      const formData = createFormData({
        id: 'some-list',
        category: 'Category',
      })

      const result = await deleteList(formData)

      expect(result.error).toBe('Not authenticated')
    })

    it('getUserChecklists should reject unauthenticated requests', async () => {
      const { getUserChecklists } = await import('@/app/_server/actions/checklist')

      const result = await getUserChecklists()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })
  })

  describe('User Actions', () => {
    it('deleteUser should reject non-admin requests', async () => {
      const { deleteUser } = await import('@/app/_server/actions/users')

      const formData = createFormData({
        username: 'victim',
      })

      const result = await deleteUser(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized: Admin access required')
    })

    it('updateUser should reject non-admin requests', async () => {
      const { updateUser } = await import('@/app/_server/actions/users')

      const formData = createFormData({
        username: 'victim',
        newUsername: 'hacked',
        isAdmin: 'true',
      })

      const result = await updateUser(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized: Admin access required')
    })

    it('updateProfile should reject unauthenticated requests', async () => {
      const { updateProfile } = await import('@/app/_server/actions/users')

      const formData = createFormData({
        newUsername: 'hacker',
      })

      const result = await updateProfile(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })

    it('updateUserSettings should reject unauthenticated requests', async () => {
      const { updateUserSettings } = await import('@/app/_server/actions/users')

      const result = await updateUserSettings({ preferredDateFormat: 'mm/dd/yyyy' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })

    it('deleteAccount should reject unauthenticated requests', async () => {
      const { deleteAccount } = await import('@/app/_server/actions/users')

      const formData = createFormData({
        confirmPassword: 'password',
      })

      const result = await deleteAccount(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })
  })

  describe('Category Actions', () => {
    it('createCategory should fail for unauthenticated users', async () => {
      const { createCategory } = await import('@/app/_server/actions/category')

      const formData = createFormData({
        name: 'Malicious Category',
        mode: 'checklists',
      })

      const result = await createCategory(formData)

      expect(result.error).toBeDefined()
    })

    it('deleteCategory should fail for unauthenticated users', async () => {
      const { deleteCategory } = await import('@/app/_server/actions/category')

      const formData = createFormData({
        path: 'SomeCategory',
        mode: 'checklists',
      })

      const result = await deleteCategory(formData)

      expect(result.error).toBeDefined()
    })
  })
})
