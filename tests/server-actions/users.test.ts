import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockFs, mockLock, mockUnlock, resetAllMocks, createFormData } from '../setup'

const mockReadJsonFile = vi.fn()
const mockWriteJsonFile = vi.fn()
const mockGetSessionId = vi.fn()
const mockReadSessions = vi.fn()
const mockLogUserEvent = vi.fn()
const mockLogAudit = vi.fn()

vi.mock('@/app/_server/actions/file', () => ({
  readJsonFile: (...args: any[]) => mockReadJsonFile(...args),
  writeJsonFile: (...args: any[]) => mockWriteJsonFile(...args),
}))

vi.mock('@/app/_server/actions/session', () => ({
  getSessionId: (...args: any[]) => mockGetSessionId(...args),
  readSessions: (...args: any[]) => mockReadSessions(...args),
  removeAllSessionsForUser: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/app/_server/actions/log', () => ({
  logUserEvent: (...args: any[]) => mockLogUserEvent(...args),
  logAudit: (...args: any[]) => mockLogAudit(...args),
}))

import {
  createUser,
  getUserByUsername,
  hasUsers,
  updateProfile,
  deleteUser,
  getUsers,
  updateUserSettings,
} from '@/app/_server/actions/users'

describe('Users Actions', () => {
  beforeEach(() => {
    resetAllMocks()
    mockReadJsonFile.mockResolvedValue([])
    mockWriteJsonFile.mockResolvedValue(undefined)
    mockGetSessionId.mockResolvedValue('session-123')
    mockReadSessions.mockResolvedValue({ 'session-123': 'testuser' })
    mockLogUserEvent.mockResolvedValue(undefined)
    mockLogAudit.mockResolvedValue(undefined)
    mockFs.rm.mockResolvedValue(undefined)
  })

  describe('createUser', () => {
    it('should return error when fields are missing', async () => {
      const formData = createFormData({
        username: 'newuser',
        password: '',
        confirmPassword: '',
      })

      const result = await createUser(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Username, password, and confirm password are required')
    })

    it('should return error when username is too short', async () => {
      const formData = createFormData({
        username: 'ab',
        password: 'password123',
        confirmPassword: 'password123',
      })

      const result = await createUser(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Username must be at least 3 characters long')
    })

    it('should return error when password is too short', async () => {
      const formData = createFormData({
        username: 'newuser',
        password: '12345',
        confirmPassword: '12345',
      })

      const result = await createUser(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Password must be at least 6 characters long')
    })

    it('should return error when passwords do not match', async () => {
      const formData = createFormData({
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'different',
      })

      const result = await createUser(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Passwords do not match')
    })

    it('should return error when username already exists', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'existinguser', passwordHash: 'hash', isAdmin: false },
      ])

      const formData = createFormData({
        username: 'existinguser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      const result = await createUser(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Username already exists')
    })

    it('should create user successfully', async () => {
      mockReadJsonFile.mockResolvedValue([])

      const formData = createFormData({
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
        isAdmin: 'false',
      })

      const result = await createUser(formData)

      expect(result.success).toBe(true)
      expect(result.data?.username).toBe('newuser')
      expect(result.data?.isAdmin).toBe(false)
      expect(result.data).not.toHaveProperty('passwordHash')
      expect(mockWriteJsonFile).toHaveBeenCalled()
      expect(mockLogUserEvent).toHaveBeenCalledWith('user_created', 'newuser', true, { isAdmin: false })
    })

    it('should create admin user when specified', async () => {
      mockReadJsonFile.mockResolvedValue([])

      const formData = createFormData({
        username: 'adminuser',
        password: 'password123',
        confirmPassword: 'password123',
        isAdmin: 'true',
      })

      const result = await createUser(formData)

      expect(result.success).toBe(true)
      expect(result.data?.isAdmin).toBe(true)
    })
  })

  describe('getUserByUsername', () => {
    it('should return null when user not found', async () => {
      mockReadJsonFile.mockResolvedValue([])

      const result = await getUserByUsername('nonexistent')

      expect(result).toBeNull()
    })

    it('should return user when found', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'testuser', passwordHash: 'hash', isAdmin: true },
      ])

      const result = await getUserByUsername('testuser')

      expect(result).not.toBeNull()
      expect(result?.username).toBe('testuser')
      expect(result?.isAdmin).toBe(true)
    })
  })

  describe('hasUsers', () => {
    it('should return false when no users exist', async () => {
      mockReadJsonFile.mockResolvedValue([])

      const result = await hasUsers()

      expect(result).toBe(false)
    })

    it('should return true when users exist', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'testuser', passwordHash: 'hash', isAdmin: true },
      ])

      const result = await hasUsers()

      expect(result).toBe(true)
    })

    it('should return false on error', async () => {
      mockReadJsonFile.mockRejectedValue(new Error('Read error'))

      const result = await hasUsers()

      expect(result).toBe(false)
    })
  })

  describe('getUsers', () => {
    it('should return empty array when no users', async () => {
      mockReadJsonFile.mockResolvedValue([])

      const result = await getUsers()

      expect(result).toEqual([])
    })

    it('should return users without password hash', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'user1', passwordHash: 'secret', isAdmin: true, isSuperAdmin: false, avatarUrl: '/avatar.png' },
        { username: 'user2', passwordHash: 'secret2', isAdmin: false, isSuperAdmin: false },
      ])

      const result = await getUsers()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        username: 'user1',
        isAdmin: true,
        isSuperAdmin: false,
        avatarUrl: '/avatar.png',
      })
      expect(result[1]).toEqual({
        username: 'user2',
        isAdmin: false,
        isSuperAdmin: false,
        avatarUrl: undefined,
      })
    })
  })

  describe('deleteUser', () => {
    it('should return error when not admin', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'regularuser', passwordHash: 'hash', isAdmin: false },
      ])
      mockReadSessions.mockResolvedValue({ 'session-123': 'regularuser' })

      const formData = createFormData({
        username: 'targetuser',
      })

      const result = await deleteUser(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized: Admin access required')
    })

    it('should return error when username not provided', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'adminuser', passwordHash: 'hash', isAdmin: true },
      ])
      mockReadSessions.mockResolvedValue({ 'session-123': 'adminuser' })

      const formData = createFormData({})

      const result = await deleteUser(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Username is required')
    })

    it('should not delete super admin', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'adminuser', passwordHash: 'hash', isAdmin: true },
        { username: 'superadmin', passwordHash: 'hash', isAdmin: true, isSuperAdmin: true },
      ])
      mockReadSessions.mockResolvedValue({ 'session-123': 'adminuser' })

      const formData = createFormData({
        username: 'superadmin',
      })

      const result = await deleteUser(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot delete the super admin (system owner)')
    })
  })

  describe('updateUserSettings', () => {
    it('should return error when not authenticated', async () => {
      mockGetSessionId.mockResolvedValue(null)
      mockReadSessions.mockResolvedValue({})

      const result = await updateUserSettings({ preferredDateFormat: 'mm/dd/yyyy' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })

    it('should update settings successfully', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'testuser', passwordHash: 'hash', isAdmin: false, preferredDateFormat: 'dd/mm/yyyy' },
      ])

      const result = await updateUserSettings({ preferredDateFormat: 'mm/dd/yyyy' })

      expect(result.success).toBe(true)
      expect(mockWriteJsonFile).toHaveBeenCalled()
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        level: 'INFO',
        action: 'user_settings_updated',
        success: true,
      }))
    })
  })
})
