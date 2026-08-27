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
  getCurrentUser,
  getPublicUser,
  hasUsers,
  updateProfile,
  deleteUser,
  deleteAccount,
  getUsers,
  getUsersForAdmin,
  updateUserSettings,
  ensureUser,
} from '@/app/_server/actions/users'
import { getCurrentUserRecord } from '@/app/_server/actions/users/records'
import { createHash } from 'crypto'

const hashOf = (password: string): string =>
  createHash('sha256').update(password).digest('hex')

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
    beforeEach(() => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'testuser', passwordHash: 'hash', isAdmin: true },
      ])
    })

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
        username: 'a',
        password: 'password123',
        confirmPassword: 'password123',
      })

      const result = await createUser(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Username must be at least 2 characters long')
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
        { username: 'testuser', passwordHash: 'hash', isAdmin: true },
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
      mockReadJsonFile.mockResolvedValue([
        { username: 'testuser', passwordHash: 'hash', isAdmin: true },
      ])

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
      mockReadJsonFile.mockResolvedValue([
        { username: 'testuser', passwordHash: 'hash', isAdmin: true },
      ])

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

  describe('getPublicUser', () => {
    it('should return null when user not found', async () => {
      mockReadJsonFile.mockResolvedValue([])

      const result = await getPublicUser('nonexistent')

      expect(result).toBeNull()
    })

    it('should return public display fields when found', async () => {
      mockReadJsonFile.mockResolvedValue([
        {
          username: 'testuser',
          passwordHash: 'hash',
          isAdmin: true,
          isSuperAdmin: false,
          avatarUrl: '/uploads/avatar.png',
        },
      ])

      const result = await getPublicUser('testuser')

      expect(result).toEqual({
        username: 'testuser',
        isAdmin: true,
        isSuperAdmin: false,
        avatarUrl: '/uploads/avatar.png',
      })
    })

    it('should never expose credentials or mfa secrets', async () => {
      mockReadJsonFile.mockResolvedValue([
        {
          username: 'victim',
          passwordHash: 'victim_hash',
          apiKey: 'victim_api_key',
          mfaSecret: 'victim_mfa_secret',
          mfaRecoveryCode: 'victim_recovery_code',
          lastLogin: '2024-01-01',
          isAdmin: false,
        },
      ])

      const result = await getPublicUser('victim')

      expect(result).not.toBeNull()
      expect(result).not.toHaveProperty('passwordHash')
      expect(result).not.toHaveProperty('apiKey')
      expect(result).not.toHaveProperty('mfaSecret')
      expect(result).not.toHaveProperty('mfaRecoveryCode')
      expect(result).not.toHaveProperty('lastLogin')
      expect(JSON.stringify(result)).not.toContain('victim_hash')
      expect(JSON.stringify(result)).not.toContain('victim_api_key')
      expect(JSON.stringify(result)).not.toContain('victim_mfa_secret')
      expect(JSON.stringify(result)).not.toContain('victim_recovery_code')
    })
  })

  describe('getCurrentUser', () => {
    const sessionRecord = {
      username: 'testuser',
      passwordHash: 'session_hash',
      apiKey: 'session_api_key',
      mfaSecret: 'session_mfa_secret',
      mfaRecoveryCode: 'session_recovery_code',
      lastLogin: '2024-01-01',
      isAdmin: true,
      preferredTheme: 'dark',
    }

    it('should return the session user without credentials or mfa secrets', async () => {
      mockReadJsonFile.mockResolvedValue([sessionRecord])

      const result = await getCurrentUser()

      expect(result?.username).toBe('testuser')
      expect(result?.isAdmin).toBe(true)
      expect(result?.preferredTheme).toBe('dark')
      expect(result).not.toHaveProperty('passwordHash')
      expect(result).not.toHaveProperty('apiKey')
      expect(result).not.toHaveProperty('mfaSecret')
      expect(result).not.toHaveProperty('mfaRecoveryCode')
      expect(result).not.toHaveProperty('lastLogin')
    })

    it('should not hand back the stored record itself', async () => {
      mockReadJsonFile.mockResolvedValue([sessionRecord])

      const result = await getCurrentUser()

      expect(result).not.toBe(sessionRecord)
      expect(sessionRecord.passwordHash).toBe('session_hash')
    })

    it('getCurrentUserRecord should keep secrets available server side', async () => {
      mockReadJsonFile.mockResolvedValue([sessionRecord])

      const record = await getCurrentUserRecord()

      expect(record?.passwordHash).toBe('session_hash')
      expect(record?.apiKey).toBe('session_api_key')
      expect(record?.mfaSecret).toBe('session_mfa_secret')
      expect(record?.mfaRecoveryCode).toBe('session_recovery_code')
    })
  })

  describe('credential dependent flows', () => {
    const passwordRecord = {
      username: 'testuser',
      passwordHash: hashOf('correct-horse'),
      isAdmin: false,
    }

    it('updateProfile should reject a wrong current password', async () => {
      mockReadJsonFile.mockResolvedValue([passwordRecord])

      const result = await updateProfile(
        createFormData({
          newUsername: 'testuser',
          currentPassword: 'wrong-password',
          newPassword: 'brand-new-password',
        })
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Current password is incorrect')
      expect(mockWriteJsonFile).not.toHaveBeenCalled()
    })

    it('updateProfile should accept the correct current password', async () => {
      mockReadJsonFile.mockResolvedValue([passwordRecord])

      const result = await updateProfile(
        createFormData({
          newUsername: 'testuser',
          currentPassword: 'correct-horse',
          newPassword: 'brand-new-password',
        })
      )

      expect(result.success).toBe(true)

      const [written] = mockWriteJsonFile.mock.calls[0]
      expect(written[0].passwordHash).toBe(hashOf('brand-new-password'))
    })

    it('deleteAccount should reject a wrong confirmation password', async () => {
      mockReadJsonFile.mockResolvedValue([passwordRecord])

      const result = await deleteAccount(
        createFormData({ confirmPassword: 'wrong-password' })
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Incorrect password')
    })

    it('deleteAccount should accept the correct confirmation password', async () => {
      mockReadJsonFile.mockResolvedValue([
        passwordRecord,
        { username: 'someoneelse', passwordHash: 'other', isAdmin: true },
      ])

      const result = await deleteAccount(
        createFormData({ confirmPassword: 'correct-horse' })
      )

      expect(result.success).toBe(true)
      expect(mockWriteJsonFile).toHaveBeenCalled()
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

  describe('getUsersForAdmin', () => {
    it('should return empty array when caller is not admin', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'regularuser', passwordHash: 'hash', isAdmin: false },
      ])
      mockReadSessions.mockResolvedValue({ 'session-123': 'regularuser' })

      const result = await getUsersForAdmin()

      expect(result).toEqual([])
    })

    it('should return sanitized users (no passwordHash/apiKey/mfaSecret) when caller is admin', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'adminuser', passwordHash: 'secret', isAdmin: true, isSuperAdmin: true, avatarUrl: '/admin.png' },
        { username: 'regularuser', passwordHash: 'secret2', isAdmin: false, isSuperAdmin: false, apiKey: 'ck_test', mfaSecret: 'totp-secret' },
      ])
      mockReadSessions.mockResolvedValue({ 'session-123': 'adminuser' })

      const result = await getUsersForAdmin()

      expect(result).toHaveLength(2)
      expect(result[0].username).toBe('adminuser')
      expect(result[0].isAdmin).toBe(true)
      expect(result[0]).not.toHaveProperty('passwordHash')
      expect(result[0]).not.toHaveProperty('apiKey')
      expect(result[0]).not.toHaveProperty('mfaSecret')
      expect(result[1].username).toBe('regularuser')
      expect(result[1].isAdmin).toBe(false)
      expect(result[1]).not.toHaveProperty('passwordHash')
      expect(result[1]).not.toHaveProperty('apiKey')
      expect(result[1]).not.toHaveProperty('mfaSecret')
    })

    it('should return empty array when users file is empty', async () => {
      mockReadJsonFile.mockResolvedValue([])
      mockReadSessions.mockResolvedValue({ 'session-123': 'adminuser' })

      const result = await getUsersForAdmin()

      expect(result).toEqual([])
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

  describe('ensureUser()', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)
      mockLock.mockResolvedValue(undefined)
      mockUnlock.mockResolvedValue(undefined)
    })

    it('creates the first user as both admin and superAdmin', async () => {
      mockFs.readFile.mockResolvedValue('[]')
      await ensureUser('alice', false)
      const written = JSON.parse(mockFs.writeFile.mock.calls[0][1])
      expect(written).toHaveLength(1)
      expect(written[0]).toMatchObject({ username: 'alice', isAdmin: true, isSuperAdmin: true })
    })

    it('creates a subsequent user with isAdmin=false when false is passed', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify([
        { username: 'existing', passwordHash: '', isAdmin: true, isSuperAdmin: true },
      ]))
      await ensureUser('bob', false)
      const written = JSON.parse(mockFs.writeFile.mock.calls[0][1])
      const bob = written.find((u: any) => u.username === 'bob')
      expect(bob).toBeDefined()
      expect(bob.isAdmin).toBe(false)
      expect(bob.isSuperAdmin).toBeUndefined()
    })

    it('creates a subsequent user with isAdmin=true when true is passed', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify([
        { username: 'existing', passwordHash: '', isAdmin: true, isSuperAdmin: true },
      ]))
      await ensureUser('bob', true)
      const written = JSON.parse(mockFs.writeFile.mock.calls[0][1])
      const bob = written.find((u: any) => u.username === 'bob')
      expect(bob.isAdmin).toBe(true)
    })

    it('promotes an existing non-admin user to admin when isAdmin=true', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify([
        { username: 'existing', passwordHash: '', isAdmin: true, isSuperAdmin: true },
        { username: 'alice', passwordHash: '', isAdmin: false },
      ]))
      await ensureUser('alice', true)
      const written = JSON.parse(mockFs.writeFile.mock.calls[0][1])
      const alice = written.find((u: any) => u.username === 'alice')
      expect(alice.isAdmin).toBe(true)
    })

    it('does NOT demote an existing admin user when isAdmin=false', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify([
        { username: 'alice', passwordHash: '', isAdmin: true },
      ]))
      await ensureUser('alice', false)
      const written = JSON.parse(mockFs.writeFile.mock.calls[0][1])
      const alice = written.find((u: any) => u.username === 'alice')
      expect(alice.isAdmin).toBe(true)
    })

    it('does not create a duplicate entry if called with an existing username', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify([
        { username: 'alice', passwordHash: '', isAdmin: false },
      ]))
      await ensureUser('alice', false)
      const written = JSON.parse(mockFs.writeFile.mock.calls[0][1])
      expect(written.filter((u: any) => u.username === 'alice')).toHaveLength(1)
    })

    it('creates the checklist and notes directories for the user', async () => {
      mockFs.readFile.mockResolvedValue('[]')
      await ensureUser('alice', false)
      const mkdirPaths = mockFs.mkdir.mock.calls.map((c: any[]) => c[0] as string)
      expect(mkdirPaths.some((p) => p.includes('checklists') && p.includes('alice'))).toBe(true)
      expect(mkdirPaths.some((p) => p.includes('notes') && p.includes('alice'))).toBe(true)
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

    it('should return the updated user without credentials or mfa secrets', async () => {
      mockReadJsonFile.mockResolvedValue([
        {
          username: 'testuser',
          passwordHash: 'settings_hash',
          apiKey: 'settings_api_key',
          mfaSecret: 'settings_mfa_secret',
          mfaRecoveryCode: 'settings_recovery_code',
          lastLogin: '2024-01-01',
          isAdmin: false,
          preferredDateFormat: 'dd/mm/yyyy',
        },
      ])

      const result = await updateUserSettings({ preferredDateFormat: 'mm/dd/yyyy' })

      expect(result.success).toBe(true)
      expect(result.data?.user.preferredDateFormat).toBe('mm/dd/yyyy')
      expect(result.data?.user).not.toHaveProperty('passwordHash')
      expect(result.data?.user).not.toHaveProperty('apiKey')
      expect(result.data?.user).not.toHaveProperty('mfaSecret')
      expect(result.data?.user).not.toHaveProperty('mfaRecoveryCode')
      expect(result.data?.user).not.toHaveProperty('lastLogin')
    })

    it('should ignore privilege fields sent by the caller', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'testuser', passwordHash: 'hash', isAdmin: false, preferredTheme: 'light' },
      ])

      const result = await updateUserSettings({
        preferredTheme: 'dark',
        isAdmin: true,
        isSuperAdmin: true,
      } as any)

      expect(result.success).toBe(true)

      const written = mockWriteJsonFile.mock.calls.at(-1)?.[0]
      expect(written[0].isAdmin).toBe(false)
      expect(written[0].isSuperAdmin).toBeUndefined()
      expect(written[0].preferredTheme).toBe('dark')
      expect(result.data?.user.isAdmin).toBe(false)
    })

    it('should ignore credential fields sent by the caller', async () => {
      mockReadJsonFile.mockResolvedValue([
        {
          username: 'testuser',
          passwordHash: 'original_hash',
          apiKey: 'original_key',
          mfaEnabled: true,
          mfaSecret: 'original_secret',
          isAdmin: false,
        },
      ])

      const result = await updateUserSettings({
        passwordHash: 'attacker_hash',
        apiKey: 'attacker_key',
        mfaEnabled: false,
        mfaSecret: 'attacker_secret',
        username: 'admin',
      } as any)

      expect(result.success).toBe(true)

      const written = mockWriteJsonFile.mock.calls.at(-1)?.[0]
      expect(written[0].passwordHash).toBe('original_hash')
      expect(written[0].apiKey).toBe('original_key')
      expect(written[0].mfaEnabled).toBe(true)
      expect(written[0].mfaSecret).toBe('original_secret')
      expect(written[0].username).toBe('testuser')
    })

    it('should keep the stored custom key path when encryption settings change', async () => {
      mockReadJsonFile.mockResolvedValue([
        {
          username: 'testuser',
          passwordHash: 'hash',
          isAdmin: false,
          encryptionSettings: {
            method: 'pgp',
            hasKeys: true,
            autoDecrypt: true,
            customKeyPath: '/safe/path',
          },
        },
      ])

      const result = await updateUserSettings({
        encryptionSettings: {
          method: 'xchacha',
          hasKeys: true,
          autoDecrypt: false,
          customKeyPath: '/etc/passwd',
        },
      })

      expect(result.success).toBe(true)

      const written = mockWriteJsonFile.mock.calls.at(-1)?.[0]
      expect(written[0].encryptionSettings.customKeyPath).toBe('/safe/path')
      expect(written[0].encryptionSettings.method).toBe('xchacha')
      expect(written[0].encryptionSettings.autoDecrypt).toBe(false)
    })

    it('should audit rejected fields', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'testuser', passwordHash: 'hash', isAdmin: false },
      ])

      await updateUserSettings({ isAdmin: true } as any)

      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'user_settings_rejected',
        success: false,
        metadata: expect.objectContaining({ rejected: ['isAdmin'] }),
      }))
    })
  })
})
