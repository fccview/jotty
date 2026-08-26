import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllMocks } from '../setup'

const mockReadJsonFile = vi.fn()
const mockWriteJsonFile = vi.fn()
const mockGetSessionId = vi.fn()
const mockReadSessions = vi.fn()

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
  logUserEvent: vi.fn(),
  logAudit: vi.fn(),
  logAuthEvent: vi.fn(),
}))

import {
  authenticateApiKey,
  generateApiKey,
  getApiKey,
} from '@/app/_server/actions/api'

describe('API key actions', () => {
  const userWithKey = () => ({
    username: 'testuser',
    passwordHash: 'hash',
    apiKey: 'ck_existing_key',
    isAdmin: false,
  })

  beforeEach(() => {
    resetAllMocks()
    mockWriteJsonFile.mockResolvedValue(undefined)
    mockGetSessionId.mockResolvedValue('session-123')
    mockReadSessions.mockResolvedValue({ 'session-123': 'testuser' })
  })

  describe('getApiKey', () => {
    it('should read the key off the full session record', async () => {
      mockReadJsonFile.mockResolvedValue([userWithKey()])

      const result = await getApiKey()

      expect(result.success).toBe(true)
      expect(result.data).toBe('ck_existing_key')
    })

    it('should return null when the user has no key yet', async () => {
      mockReadJsonFile.mockResolvedValue([{ ...userWithKey(), apiKey: undefined }])

      const result = await getApiKey()

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })

    it('should reject unauthenticated callers', async () => {
      mockReadJsonFile.mockResolvedValue([userWithKey()])
      mockReadSessions.mockResolvedValue({})

      const result = await getApiKey()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })
  })

  describe('generateApiKey', () => {
    it('should persist a freshly minted key for the session user', async () => {
      mockReadJsonFile.mockResolvedValue([userWithKey()])

      const result = await generateApiKey()

      expect(result.success).toBe(true)
      expect(result.data).toMatch(/^ck_[0-9a-f]{32}$/)

      const [written] = mockWriteJsonFile.mock.calls[0]
      expect(written[0].apiKey).toBe(result.data)
      expect(written[0].apiKey).not.toBe('ck_existing_key')
    })

    it('should reject unauthenticated callers', async () => {
      mockReadJsonFile.mockResolvedValue([userWithKey()])
      mockReadSessions.mockResolvedValue({})

      const result = await generateApiKey()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
      expect(mockWriteJsonFile).not.toHaveBeenCalled()
    })
  })

  describe('authenticateApiKey', () => {
    it('should resolve the full record so downstream auth keeps working', async () => {
      mockReadJsonFile.mockResolvedValue([userWithKey()])

      const user = await authenticateApiKey('ck_existing_key')

      expect(user?.username).toBe('testuser')
      expect(user?.apiKey).toBe('ck_existing_key')
    })

    it('should return null for an unknown key', async () => {
      mockReadJsonFile.mockResolvedValue([userWithKey()])

      expect(await authenticateApiKey('ck_nope')).toBeNull()
      expect(await authenticateApiKey('')).toBeNull()
    })
  })
})
