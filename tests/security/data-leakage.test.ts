import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllMocks, createFormData } from '../setup'

const mockReadJsonFile = vi.fn()
const mockWriteJsonFile = vi.fn()
const mockGetSessionId = vi.fn()
const mockReadSessions = vi.fn()

vi.mock('@/app/_server/actions/file', () => ({
  readJsonFile: () => mockReadJsonFile(),
  writeJsonFile: (...args: any[]) => mockWriteJsonFile(...args),
  ensureDir: vi.fn(),
}))

vi.mock('@/app/_server/actions/session', () => ({
  getSessionId: () => mockGetSessionId(),
  readSessions: () => mockReadSessions(),
  removeAllSessionsForUser: vi.fn(),
}))

vi.mock('@/app/_server/actions/log', () => ({
  logUserEvent: vi.fn(),
  logAudit: vi.fn(),
  logAuthEvent: vi.fn(),
}))

describe('Security: Data Leakage Prevention', () => {
  beforeEach(() => {
    resetAllMocks()
    mockGetSessionId.mockResolvedValue('session-123')
    mockReadSessions.mockResolvedValue({ 'session-123': 'testuser' })
  })

  describe('Password Hash Protection', () => {
    const userWithPassword = {
      username: 'testuser',
      passwordHash: 'super_secret_hash_12345',
      isAdmin: false,
      isSuperAdmin: false,
      createdAt: '2024-01-01',
    }

    it('getUsers should never return passwordHash', async () => {
      mockReadJsonFile.mockResolvedValue([userWithPassword])

      const { getUsers } = await import('@/app/_server/actions/users')
      const result = await getUsers()

      expect(result).toHaveLength(1)
      expect(result[0]).not.toHaveProperty('passwordHash')
      expect(result[0].username).toBe('testuser')
    })

    it('createUser should not return passwordHash in response', async () => {
      mockReadJsonFile.mockResolvedValue([])

      const { createUser } = await import('@/app/_server/actions/users')
      const formData = createFormData({
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
        isAdmin: 'false',
      })

      const result = await createUser(formData)

      expect(result.success).toBe(true)
      expect(result.data).not.toHaveProperty('passwordHash')
      expect(result.data?.username).toBe('newuser')
    })

    it('updateUser should not return passwordHash in response', async () => {
      mockReadJsonFile.mockResolvedValue([
        { ...userWithPassword, isAdmin: true },
        { username: 'adminuser', passwordHash: 'admin_hash', isAdmin: true },
      ])
      mockReadSessions.mockResolvedValue({ 'session-123': 'adminuser' })

      const { updateUser } = await import('@/app/_server/actions/users')
      const formData = createFormData({
        username: 'testuser',
        newUsername: 'testuser',
        isAdmin: 'false',
      })

      const result = await updateUser(formData)

      expect(result.success).toBe(true)
      expect(result.data).not.toHaveProperty('passwordHash')
    })
  })

  describe('Session Data Protection', () => {
    it('session IDs should not be exposed in responses', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'testuser', passwordHash: 'hash', isAdmin: false },
      ])

      const { getCurrentUser } = await import('@/app/_server/actions/users')
      const user = await getCurrentUser()

      expect(user).not.toHaveProperty('sessionId')
      expect(JSON.stringify(user)).not.toContain('session-123')
    })
  })

  describe('Sensitive Field Filtering', () => {
    it('user list should only contain safe fields', async () => {
      mockReadJsonFile.mockResolvedValue([
        {
          username: 'user1',
          passwordHash: 'secret1',
          isAdmin: true,
          isSuperAdmin: false,
          avatarUrl: '/avatar.png',
          mfaSecret: 'totp_secret_key',
          backupCodes: ['code1', 'code2'],
          failedLoginAttempts: 5,
          lastFailedLogin: '2024-01-01',
        },
      ])

      const { getUsers } = await import('@/app/_server/actions/users')
      const result = await getUsers()

      const user = result[0]
      expect(user).not.toHaveProperty('passwordHash')
      expect(user).not.toHaveProperty('mfaSecret')
      expect(user).not.toHaveProperty('backupCodes')
      expect(user).not.toHaveProperty('failedLoginAttempts')
      expect(user).not.toHaveProperty('lastFailedLogin')

      expect(user).toHaveProperty('username')
      expect(user).toHaveProperty('isAdmin')
      expect(user).toHaveProperty('isSuperAdmin')
      expect(user).toHaveProperty('avatarUrl')
    })
  })

  describe('Cross-User Data Protection', () => {
    it('should not expose other users data in error messages', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'victim', passwordHash: 'victim_hash', isAdmin: false },
        { username: 'testuser', passwordHash: 'test_hash', isAdmin: false },
      ])

      const { getUserByUsername } = await import('@/app/_server/actions/users')

      const victim = await getUserByUsername('victim')

      if (victim) {
        expect(JSON.stringify(victim)).not.toContain('testuser')
        expect(JSON.stringify(victim)).not.toContain('test_hash')
      }
    })
  })

  describe('Error Message Safety', () => {
    it('login errors should not reveal if username exists', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'realuser', passwordHash: 'hash', isAdmin: false },
      ])

      vi.mock('proper-lockfile', () => ({
        lock: vi.fn().mockResolvedValue(undefined),
        unlock: vi.fn().mockResolvedValue(undefined),
      }))

      const { login } = await import('@/app/_server/actions/auth')

      const formDataExisting = createFormData({
        username: 'realuser',
        password: 'wrongpassword',
      })

      const formDataNonExisting = createFormData({
        username: 'fakeuser',
        password: 'anypassword',
      })

      const resultExisting = await login(formDataExisting)
      const resultNonExisting = await login(formDataNonExisting)

      expect(resultExisting.error).toBe('Invalid username or password')
      expect(resultNonExisting.error).toBe('Invalid username or password')
    })
  })
})
