import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllMocks, createFormData } from '../setup'

const mockReadJsonFile = vi.fn()
const mockWriteJsonFile = vi.fn()
const mockGetSessionId = vi.fn()
const mockReadSessions = vi.fn()
const mockGrepFindFileByUuid = vi.fn()

vi.mock('@/app/_utils/grep-utils', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    grepFindFileByUuid: (...args: any[]) => mockGrepFindFileByUuid(...args),
  }
})

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

  describe('Current User Protection', () => {
    const currentRecord = {
      username: 'testuser',
      passwordHash: 'current_hash',
      apiKey: 'current_api_key',
      mfaSecret: 'current_mfa_secret',
      mfaRecoveryCode: 'current_recovery_code',
      lastLogin: '2024-06-01T00:00:00.000Z',
      isAdmin: true,
      isSuperAdmin: false,
      avatarUrl: '/uploads/testuser.png',
      preferredLocale: 'it',
    }

    const CURRENT_SECRETS = [
      'current_hash',
      'current_api_key',
      'current_mfa_secret',
      'current_recovery_code',
    ]

    it('getCurrentUser should never return credentials or secrets', async () => {
      mockReadJsonFile.mockResolvedValue([currentRecord])

      const { getCurrentUser } = await import('@/app/_server/actions/users')
      const user = await getCurrentUser()

      expect(user?.username).toBe('testuser')
      expect(user?.isAdmin).toBe(true)
      expect(user?.preferredLocale).toBe('it')

      expect(user).not.toHaveProperty('passwordHash')
      expect(user).not.toHaveProperty('apiKey')
      expect(user).not.toHaveProperty('mfaSecret')
      expect(user).not.toHaveProperty('mfaRecoveryCode')
      expect(user).not.toHaveProperty('lastLogin')

      CURRENT_SECRETS.forEach((secret) => {
        expect(JSON.stringify(user)).not.toContain(secret)
      })
    })

    it('getCurrentUser should hand back a fresh object, not the stored record', async () => {
      mockReadJsonFile.mockResolvedValue([currentRecord])

      const { getCurrentUser } = await import('@/app/_server/actions/users')
      const user = await getCurrentUser()

      expect(user).not.toBe(currentRecord)
      expect(currentRecord.passwordHash).toBe('current_hash')
    })

    it('getCurrentUser should return null without a session', async () => {
      mockReadJsonFile.mockResolvedValue([currentRecord])
      mockReadSessions.mockResolvedValue({})

      const { getCurrentUser } = await import('@/app/_server/actions/users')

      expect(await getCurrentUser()).toBeNull()
    })

    it('should not expose a browser callable full current user lookup', async () => {
      const userActions = await import('@/app/_server/actions/users')

      expect(userActions).not.toHaveProperty('getCurrentUserRecord')
      expect(userActions).not.toHaveProperty('findUserRecord')
    })

    it('getCurrentUserRecord should still expose secrets to server internals', async () => {
      mockReadJsonFile.mockResolvedValue([currentRecord])

      const { getCurrentUserRecord } = await import(
        '@/app/_server/actions/users/records'
      )
      const record = await getCurrentUserRecord()

      expect(record?.username).toBe('testuser')
      expect(record?.passwordHash).toBe('current_hash')
      expect(record?.apiKey).toBe('current_api_key')
      expect(record?.mfaSecret).toBe('current_mfa_secret')
      expect(record?.mfaRecoveryCode).toBe('current_recovery_code')
      expect(record?.lastLogin).toBe('2024-06-01T00:00:00.000Z')
    })

    it('getCurrentUserRecord should return null without a session', async () => {
      mockReadJsonFile.mockResolvedValue([currentRecord])
      mockReadSessions.mockResolvedValue({})

      const { getCurrentUserRecord } = await import(
        '@/app/_server/actions/users/records'
      )

      expect(await getCurrentUserRecord()).toBeNull()
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
    const victimRecord = {
      username: 'victim',
      passwordHash: 'victim_hash',
      apiKey: 'victim_api_key',
      mfaSecret: 'victim_mfa_secret',
      mfaRecoveryCode: 'victim_recovery_code',
      isAdmin: false,
      isSuperAdmin: false,
      avatarUrl: '/uploads/victim.png',
    }

    const SECRET_VALUES = [
      'victim_hash',
      'victim_api_key',
      'victim_mfa_secret',
      'victim_recovery_code',
    ]

    it('should not expose other users data in error messages', async () => {
      mockReadJsonFile.mockResolvedValue([
        victimRecord,
        { username: 'testuser', passwordHash: 'test_hash', isAdmin: false },
      ])

      const { getPublicUser } = await import('@/app/_server/actions/users')

      const victim = await getPublicUser('victim')

      if (victim) {
        expect(JSON.stringify(victim)).not.toContain('testuser')
        expect(JSON.stringify(victim)).not.toContain('test_hash')
      }
    })

    it('getPublicUser should never return another users secrets', async () => {
      mockReadJsonFile.mockResolvedValue([
        victimRecord,
        { username: 'testuser', passwordHash: 'test_hash', isAdmin: false },
      ])

      const { getPublicUser } = await import('@/app/_server/actions/users')

      const victim = await getPublicUser('victim')

      expect(victim?.username).toBe('victim')
      expect(victim?.avatarUrl).toBe('/uploads/victim.png')
      expect(victim).not.toHaveProperty('passwordHash')
      expect(victim).not.toHaveProperty('apiKey')
      expect(victim).not.toHaveProperty('mfaSecret')
      expect(victim).not.toHaveProperty('mfaRecoveryCode')

      SECRET_VALUES.forEach((secret) => {
        expect(JSON.stringify(victim)).not.toContain(secret)
      })
    })

    it('should not expose a browser callable full user lookup', async () => {
      const userActions = await import('@/app/_server/actions/users')

      expect(userActions).not.toHaveProperty('getUserByUsername')
    })

    it('owner lookup by item uuid should only return public fields', async () => {
      mockReadJsonFile.mockResolvedValue([victimRecord])
      mockGrepFindFileByUuid.mockResolvedValue({ filePath: '/data/victim/note.md' })

      const { getUserByNoteUuid } = await import('@/app/_server/actions/users')

      const result = await getUserByNoteUuid('note-uuid-1')

      expect(result.success).toBe(true)
      expect(result.data?.username).toBe('victim')
      expect(result.data).not.toHaveProperty('passwordHash')
      expect(result.data).not.toHaveProperty('apiKey')
      expect(result.data).not.toHaveProperty('mfaSecret')
      expect(result.data).not.toHaveProperty('mfaRecoveryCode')

      SECRET_VALUES.forEach((secret) => {
        expect(JSON.stringify(result)).not.toContain(secret)
      })
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
