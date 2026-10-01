import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockLock, mockUnlock, resetAllMocks } from '../setup'
import { withFileLock } from '@/app/_server/actions/lib/file-lock'

const USERS = '/data/users/users.json'

const _held = () => {
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => { release = resolve })
  return { gate, release }
}

describe('withFileLock', () => {
  beforeEach(() => {
    resetAllMocks()
    mockLock.mockResolvedValue(undefined)
    mockUnlock.mockResolvedValue(undefined)
  })

  it('runs errands on the same file one at a time', async () => {
    const first = _held()
    const order: string[] = []

    const a = withFileLock(USERS, async () => { order.push('a:start'); await first.gate; order.push('a:end') })
    const b = withFileLock(USERS, async () => { order.push('b:start') })

    await vi.waitFor(() => expect(order).toEqual(['a:start']))
    expect(mockLock).toHaveBeenCalledTimes(1)

    first.release()
    await Promise.all([a, b])

    expect(order).toEqual(['a:start', 'a:end', 'b:start'])
    expect(mockLock).toHaveBeenCalledTimes(2)
    expect(mockUnlock).toHaveBeenCalledTimes(2)
  })

  it('does not hold up errands on other files', async () => {
    const first = _held()
    const done: string[] = []

    const a = withFileLock(USERS, async () => { await first.gate; done.push('users') })
    await withFileLock('/data/users/sessions.json', async () => { done.push('sessions') })

    expect(done).toEqual(['sessions'])
    first.release()
    await a
  })

  it('releases the lock when the errand throws', async () => {
    await expect(withFileLock(USERS, async () => { throw new Error('boom') })).rejects.toThrow('boom')
    expect(mockUnlock).toHaveBeenCalledWith(USERS)

    await withFileLock(USERS, async () => 'next')
    expect(mockLock).toHaveBeenCalledTimes(2)
  })

  it('logs a compromised lock instead of throwing', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await withFileLock(USERS, async () => 'ok')
    const { onCompromised } = mockLock.mock.calls[0][1]

    expect(() => onCompromised(Object.assign(new Error('gone'), { code: 'ECOMPROMISED' }))).not.toThrow()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
