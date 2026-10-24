import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockRead = vi.fn()
const mockWriteJson = vi.fn()

vi.mock('@/app/_server/actions/file', () => ({
  readJsonFile: (...args: unknown[]) => mockRead(...args),
  writeJsonFile: (...args: unknown[]) => mockWriteJson(...args),
  ensureDir: vi.fn(),
}))

vi.mock('@/app/_server/actions/ws/broadcast', () => ({
  broadcast: vi.fn().mockResolvedValue(undefined),
}))

const assignment = { type: 'assignment' as const, title: 'Card', message: 'you got a card' }

describe('Security: notification files stay in the notifications folder', () => {
  beforeEach(() => {
    mockRead.mockReset().mockResolvedValue([])
    mockWriteJson.mockReset()
  })

  it.each(['../users/owner', '../../etc/passwd', 'a/b', 'a\\b'])('refuses the recipient %s and writes nothing', async (recipient) => {
    const { notifyUser } = await import('@/app/_server/actions/notifications/internal')

    expect(await notifyUser(recipient, assignment)).toEqual(expect.objectContaining({ success: false }))
    expect(mockWriteJson).not.toHaveBeenCalled()
  })

  it('still writes for a plain username', async () => {
    const { notifyUser } = await import('@/app/_server/actions/notifications/internal')

    await notifyUser('owner', assignment)

    expect(mockWriteJson).toHaveBeenCalledTimes(1)
    expect(String(mockWriteJson.mock.calls[0][1])).toMatch(/notifications[\\/]owner\.json$/)
  })
})
