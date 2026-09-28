import { describe, it, expect, beforeEach, vi } from 'vitest'
import path from 'path'
import { mockFs, resetAllMocks, createFormData } from '../setup'

const mockGetCurrentUser = vi.fn()
const mockServerDeleteFile = vi.fn()
const { USER_DIR } = vi.hoisted(() => ({ USER_DIR: '/srv/jotty/data/notes/alice' }))

vi.mock('@/app/_server/actions/users', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}))

vi.mock('@/app/_server/actions/file', () => ({
  getUserModeDir: vi.fn().mockResolvedValue(USER_DIR),
  serverDeleteFile: (...args: unknown[]) => mockServerDeleteFile(...args),
}))

vi.mock('@/app/_server/actions/config', () => ({
  getSettings: vi.fn().mockResolvedValue({}),
}))

import { deleteFile } from '@/app/_server/actions/upload'

const attempt = (fileName: string, fileType = 'image') =>
  deleteFile(createFormData({ fileName, fileType }))

describe('Security: deleteFile stays inside the upload folder', () => {
  beforeEach(() => {
    resetAllMocks()
    mockServerDeleteFile.mockReset().mockResolvedValue(undefined)
    mockGetCurrentUser.mockResolvedValue({ username: 'alice' })
    mockFs.stat.mockResolvedValue({ isFile: () => true })
  })

  it.each([
    '../../bob/Uncategorized/diary.md',
    '../../../users/users.json',
    '..',
    '/etc/passwd',
    path.resolve(USER_DIR, '..', 'bob', 'x.png'),
    '..%2F..%2Fbob%2Fnote.md',
    '%2e%2e%2f%2e%2e%2fusers.json',
    '..%5C..%5Cusers.json',
    'nested/pic.png',
    'pic.png\0.md',
    'pic.png%00',
    '%E0%A4%A',
  ])('refuses %s and deletes nothing', async (fileName) => {
    const result = await attempt(fileName)

    expect(result.success).toBe(false)
    expect(mockServerDeleteFile).not.toHaveBeenCalled()
    expect(mockFs.unlink).not.toHaveBeenCalled()
  })

  it('refuses without a session', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    expect((await attempt('pic.png')).success).toBe(false)
    expect(mockServerDeleteFile).not.toHaveBeenCalled()
  })

  it('refuses to delete a directory', async () => {
    mockFs.stat.mockResolvedValue({ isFile: () => false })

    expect((await attempt('pic.png')).success).toBe(false)
    expect(mockServerDeleteFile).not.toHaveBeenCalled()
  })

  it('reports a missing file', async () => {
    mockFs.stat.mockRejectedValue(Object.assign(new Error('nope'), { code: 'ENOENT' }))

    expect(await attempt('gone.png')).toEqual({ success: false, error: 'File not found' })
  })

  it.each([
    ['image', 'images'],
    ['video', 'videos'],
    ['file', 'files'],
  ])('deletes a plain %s through the file helper', async (fileType, folder) => {
    const result = await attempt('pic-1.png', fileType)

    expect(result.success).toBe(true)
    expect(mockServerDeleteFile).toHaveBeenCalledWith(path.join(USER_DIR, folder, 'pic-1.png'))
    expect(mockFs.unlink).not.toHaveBeenCalled()
  })
})
