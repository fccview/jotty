import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  mockCookies,
  mockRedirect,
  mockFs,
  mockLock,
  mockUnlock,
  resetAllMocks,
  createFormData,
} from '../setup'

vi.mock('@/app/_server/actions/session', () => ({
  createSession: vi.fn().mockResolvedValue(undefined),
  readSessionData: vi.fn().mockResolvedValue({}),
  readSessions: vi.fn().mockResolvedValue({}),
  removeSession: vi.fn().mockResolvedValue(undefined),
  writeSessionData: vi.fn().mockResolvedValue(undefined),
  writeSessions: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/app/_server/actions/file', () => ({
  ensureCorDirsAndFiles: vi.fn().mockResolvedValue(undefined),
  ensureDir: vi.fn().mockResolvedValue(undefined),
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/app/_server/actions/log', () => ({
  logAuthEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/app/_server/actions/users', () => ({
  getUsername: vi.fn().mockResolvedValue('testuser'),
}))

import { register, login, logout } from '@/app/_server/actions/auth'
import { readJsonFile, writeJsonFile } from '@/app/_server/actions/file'
import { readSessions, writeSessions } from '@/app/_server/actions/session'

const mockReadJsonFile = readJsonFile as ReturnType<typeof vi.fn>
const mockWriteJsonFile = writeJsonFile as ReturnType<typeof vi.fn>
const mockReadSessions = readSessions as ReturnType<typeof vi.fn>
const mockWriteSessions = writeSessions as ReturnType<typeof vi.fn>

describe('Auth Actions', () => {
  beforeEach(() => {
    resetAllMocks()
    mockReadJsonFile.mockResolvedValue([])
    mockReadSessions.mockResolvedValue({})
    mockLock.mockResolvedValue(undefined)
    mockUnlock.mockResolvedValue(undefined)
    mockFs.mkdir.mockResolvedValue(undefined)
  })

  describe('register', () => {
    it('should return error when fields are missing', async () => {
      const formData = createFormData({
        username: 'testuser',
        password: '',
        confirmPassword: '',
      })

      const result = await register(formData)

      expect(result).toEqual({ error: 'All fields are required' })
    })

    it('should return error when passwords do not match', async () => {
      const formData = createFormData({
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'different',
      })

      const result = await register(formData)

      expect(result).toEqual({ error: 'Passwords do not match' })
    })

    it('should return error when username already exists', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'testuser', passwordHash: 'hash', isAdmin: true },
      ])

      const formData = createFormData({
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      const result = await register(formData)

      expect(result).toEqual({ error: 'Username already exists' })
    })

    it('should create first user as admin and super admin', async () => {
      mockReadJsonFile.mockResolvedValue([])
      mockFs.mkdir.mockResolvedValue(undefined)

      const formData = createFormData({
        username: 'firstuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      try {
        await register(formData)
      } catch (e: any) {
        expect(e.message).toContain('REDIRECT:/')
      }

      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            username: 'firstuser',
            isAdmin: true,
            isSuperAdmin: true,
          }),
        ]),
        expect.any(String)
      )
    })

    it('should create subsequent users as non-admin', async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: 'existinguser', passwordHash: 'hash', isAdmin: true },
      ])
      mockFs.mkdir.mockResolvedValue(undefined)

      const formData = createFormData({
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      try {
        await register(formData)
      } catch (e: any) {
        expect(e.message).toContain('REDIRECT:/')
      }

      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            username: 'newuser',
            isAdmin: false,
          }),
        ]),
        expect.any(String)
      )
    })

    it('should set session cookie on successful registration', async () => {
      mockReadJsonFile.mockResolvedValue([])
      mockFs.mkdir.mockResolvedValue(undefined)

      const formData = createFormData({
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      try {
        await register(formData)
      } catch (e: any) {
        expect(e.message).toContain('REDIRECT:/')
      }

      expect(mockCookies.set).toHaveBeenCalledWith(
        'session',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        })
      )
    })
  })

  describe('login', () => {
    const existingUser = {
      username: 'testuser',
      passwordHash: '5e884898da28047d9169e11b6aeca1f0b7c3e4ea8f55c14e95d7d3d7d3d7d3d7',
      isAdmin: false,
    }

    beforeEach(() => {
      mockFs.readFile.mockResolvedValue(JSON.stringify([existingUser]))
    })

    it('should return error when fields are missing', async () => {
      const formData = createFormData({
        username: '',
        password: '',
      })

      const result = await login(formData)

      expect(result).toEqual({ error: 'Username and password are required' })
    })

    it('should return error for invalid credentials', async () => {
      mockReadJsonFile.mockResolvedValue([existingUser])

      const formData = createFormData({
        username: 'testuser',
        password: 'wrongpassword',
      })

      const result = await login(formData)

      expect(result).toHaveProperty('error')
      expect(mockLock).toHaveBeenCalled()
      expect(mockUnlock).toHaveBeenCalled()
    })

    it('should return error for non-existent user', async () => {
      mockReadJsonFile.mockResolvedValue([existingUser])

      const formData = createFormData({
        username: 'nonexistent',
        password: 'password123',
      })

      const result = await login(formData)

      expect(result).toEqual({ error: 'Invalid username or password' })
    })

    it('should acquire and release lock during login', async () => {
      mockReadJsonFile.mockResolvedValue([existingUser])

      const formData = createFormData({
        username: 'testuser',
        password: 'wrongpassword',
      })

      await login(formData)

      expect(mockLock).toHaveBeenCalled()
      expect(mockUnlock).toHaveBeenCalled()
    })
  })

  describe('logout', () => {
    it('should delete session cookie', async () => {
      mockCookies.get.mockReturnValue({ value: 'session-id-123' })

      try {
        await logout()
      } catch (e: any) {
        expect(e.message).toContain('REDIRECT:')
      }

      expect(mockCookies.delete).toHaveBeenCalledWith('session')
    })

    it('should redirect to login page', async () => {
      mockCookies.get.mockReturnValue({ value: 'session-id-123' })

      try {
        await logout()
      } catch (e: any) {
        expect(e.message).toContain('REDIRECT:/auth/login')
      }
    })
  })
})
