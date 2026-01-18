import { vi, beforeAll, afterAll } from 'vitest'

const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.error = vi.fn()
  console.warn = vi.fn()
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

export const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}

export const mockRedirect = vi.fn()
export const mockRevalidatePath = vi.fn()

vi.mock('next/headers', () => ({
  cookies: () => mockCookies,
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error(`REDIRECT:${url}`)
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

export const mockFs = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  access: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
  unlink: vi.fn(),
}

vi.mock('fs/promises', () => ({
  default: mockFs,
  ...mockFs,
}))

export const mockLock = vi.fn().mockResolvedValue(undefined)
export const mockUnlock = vi.fn().mockResolvedValue(undefined)

vi.mock('proper-lockfile', () => ({
  lock: mockLock,
  unlock: mockUnlock,
}))

export function resetAllMocks() {
  vi.clearAllMocks()
  mockCookies.get.mockReset()
  mockCookies.set.mockReset()
  mockCookies.delete.mockReset()
  mockRedirect.mockReset()
  mockRevalidatePath.mockReset()
  mockFs.readFile.mockReset()
  mockFs.writeFile.mockReset()
  mockFs.mkdir.mockReset()
  mockFs.readdir.mockReset()
  mockFs.stat.mockReset()
  mockFs.access.mockReset()
  mockFs.rename.mockReset()
  mockFs.rm.mockReset()
  mockFs.unlink.mockReset()
  mockLock.mockReset()
  mockUnlock.mockReset()
}

export function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value)
  }
  return formData
}
