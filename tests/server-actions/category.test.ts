import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  mockFs,
  mockRevalidatePath,
  resetAllMocks,
  createFormData,
} from '../setup'
import { Modes } from '@/app/_types/enums'

const mockGetUserModeDir = vi.fn()
const mockEnsureDir = vi.fn()
const mockServerDeleteDir = vi.fn()
const mockReadOrderFile = vi.fn()
const mockWriteOrderFile = vi.fn()
const mockLogAudit = vi.fn()
const mockServerReadDir = vi.fn()
const mockBuildCategoryTree = vi.fn()
const mockMountsFor = vi.fn()
const mockCatAccess = vi.fn()

vi.mock('@/app/_server/actions/file', () => ({
  ensureDir: (...args: any[]) => mockEnsureDir(...args),
  serverDeleteDir: (...args: any[]) => mockServerDeleteDir(...args),
  getUserModeDir: (...args: any[]) => mockGetUserModeDir(...args),
  readOrderFile: (...args: any[]) => mockReadOrderFile(...args),
  writeOrderFile: (...args: any[]) => mockWriteOrderFile(...args),
  serverReadDir: (...args: any[]) => mockServerReadDir(...args),
}))

vi.mock('@/app/_server/actions/share/mounts', () => ({
  mountsFor: (...args: any[]) => mockMountsFor(...args),
  userDirFor: (_mode: string, username: string) => `data/checklists/${username}`,
}))

vi.mock('@/app/_server/actions/share/access', () => ({
  catAccess: (...args: any[]) => mockCatAccess(...args),
}))

vi.mock('@/app/_server/actions/log', () => ({
  logAudit: (...args: any[]) => mockLogAudit(...args),
}))

vi.mock('@/app/_server/actions/users', () => ({
  getUsername: vi.fn().mockResolvedValue('testuser'),
}))

vi.mock('@/app/_utils/category-utils', () => ({
  buildCategoryTree: (...args: any[]) => mockBuildCategoryTree(...args),
}))

import {
  createCategory,
  deleteCategory,
  renameCategory,
  getCategories,
} from '@/app/_server/actions/category'

describe('Category Actions', () => {
  beforeEach(() => {
    resetAllMocks()
    mockGetUserModeDir.mockResolvedValue('/data/checklists/testuser')
    mockEnsureDir.mockResolvedValue(undefined)
    mockServerDeleteDir.mockResolvedValue(undefined)
    mockLogAudit.mockResolvedValue(undefined)
    mockReadOrderFile.mockResolvedValue(null)
    mockWriteOrderFile.mockResolvedValue({ success: true })
    mockServerReadDir.mockResolvedValue([])
    mockBuildCategoryTree.mockResolvedValue([])
    mockMountsFor.mockResolvedValue([])
    mockCatAccess.mockResolvedValue(null)
  })

  describe('createCategory', () => {
    it('should create a category successfully', async () => {
      const formData = createFormData({
        name: 'New Category',
        parent: '',
        mode: Modes.CHECKLISTS,
      })

      const result = await createCategory(formData)

      expect(result).toEqual({
        success: true,
        data: { name: 'New Category', count: 0 },
      })
      expect(mockEnsureDir).toHaveBeenCalled()
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'INFO',
          action: 'category_created',
          success: true,
        })
      )
    })

    it('should create a nested category with parent', async () => {
      const formData = createFormData({
        name: 'Subcategory',
        parent: 'ParentCategory',
        mode: Modes.CHECKLISTS,
      })

      const result = await createCategory(formData)

      expect(result.success).toBe(true)
      expect(mockEnsureDir).toHaveBeenCalledWith(
        expect.stringContaining('ParentCategory')
      )
    })

    it('should handle errors and log them', async () => {
      mockEnsureDir.mockRejectedValue(new Error('Filesystem error'))

      const formData = createFormData({
        name: 'New Category',
        parent: '',
        mode: Modes.CHECKLISTS,
      })

      const result = await createCategory(formData)

      expect(result).toEqual({ error: 'Failed to create category' })
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'ERROR',
          success: false,
        })
      )
    })
  })

  describe('deleteCategory', () => {
    it('should delete a category successfully', async () => {
      const formData = createFormData({
        path: 'CategoryToDelete',
        mode: Modes.CHECKLISTS,
      })

      const result = await deleteCategory(formData)

      expect(result).toEqual({ success: true })
      expect(mockServerDeleteDir).toHaveBeenCalled()
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'INFO',
          action: 'category_deleted',
          success: true,
        })
      )
    })

    it('should revalidate path after deletion', async () => {
      const formData = createFormData({
        path: 'CategoryToDelete',
        mode: Modes.CHECKLISTS,
      })

      await deleteCategory(formData)

      expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    })

    it('should handle deletion errors', async () => {
      mockServerDeleteDir.mockRejectedValue(new Error('Cannot delete'))

      const formData = createFormData({
        path: 'CategoryToDelete',
        mode: Modes.CHECKLISTS,
      })

      const result = await deleteCategory(formData)

      expect(result).toEqual({ error: 'Failed to delete category' })
    })
  })

  describe('renameCategory', () => {
    it('should return error when parameters are missing', async () => {
      const formData = createFormData({
        oldPath: '',
        newName: '',
        mode: Modes.CHECKLISTS,
      })

      const result = await renameCategory(formData)

      expect(result).toEqual({
        error: 'Both old path and new name are required',
      })
    })

    it('should return error when category not found', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'))

      const formData = createFormData({
        oldPath: 'NonExistent',
        newName: 'NewName',
        mode: Modes.CHECKLISTS,
      })

      const result = await renameCategory(formData)

      expect(result).toEqual({ error: 'Category not found' })
    })

    it('should return error when new name already exists', async () => {
      mockFs.access.mockResolvedValue(undefined)

      const formData = createFormData({
        oldPath: 'OldCategory',
        newName: 'ExistingCategory',
        mode: Modes.CHECKLISTS,
      })

      const result = await renameCategory(formData)

      expect(result).toEqual({
        error: 'Category with new name already exists',
      })
    })

    it('should rename category successfully', async () => {
      mockFs.access
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('ENOENT'))
      mockFs.rename.mockResolvedValue(undefined)

      const formData = createFormData({
        oldPath: 'OldCategory',
        newName: 'NewCategory',
        mode: Modes.CHECKLISTS,
      })

      const result = await renameCategory(formData)

      expect(result).toEqual({ success: true })
      expect(mockFs.rename).toHaveBeenCalled()
      expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    })
  })

  describe('getCategories', () => {
    it('should return categories successfully', async () => {
      const result = await getCategories(Modes.CHECKLISTS)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should ensure directory exists', async () => {
      await getCategories(Modes.CHECKLISTS)

      expect(mockEnsureDir).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      mockGetUserModeDir.mockRejectedValue(new Error('Failed'))

      const result = await getCategories(Modes.CHECKLISTS)

      expect(result).toEqual({
        error: 'Failed to fetch document categories',
      })
    })
  })

  describe('shared mount roots', () => {
    const explicitMount = {
      owner: 'bob',
      displayName: 'Bob Work',
      categoryPath: 'Work',
      categoryUuid: 'mount-uuid',
      permissions: { canEdit: true },
      isImplicit: false,
    }

    const ownerDir = `${process.cwd()}/data/checklists/bob/Work`

    beforeEach(() => {
      mockBuildCategoryTree.mockImplementation(async (dir: string) =>
        dir === ownerDir
          ? [
              {
                name: 'Sub',
                count: 1,
                path: 'Bob Work/Sub',
                level: 1,
                uuid: 'sub-uuid',
              },
            ]
          : []
      )
      mockServerReadDir.mockImplementation(async (dir: string) =>
        dir === ownerDir
          ? [
              { name: 'one.md', isFile: () => true, isDirectory: () => false },
              { name: 'two.md', isFile: () => true, isDirectory: () => false },
              { name: 'Sub', isFile: () => false, isDirectory: () => true },
              { name: 'notes.txt', isFile: () => true, isDirectory: () => false },
            ]
          : []
      )
    })

    it('should count direct markdown items in an explicit shared root', async () => {
      mockMountsFor.mockResolvedValue([explicitMount])
      mockCatAccess.mockResolvedValue({ users: { testuser: { canEdit: true } } })

      const result = await getCategories(Modes.CHECKLISTS)
      const root = result.data?.find((c: any) => c.path === 'Bob Work')

      expect(root?.count).toBe(2)
    })

    it('should not fold a subfolder into the root count', async () => {
      mockMountsFor.mockResolvedValue([explicitMount])
      mockCatAccess.mockResolvedValue({ users: { testuser: { canEdit: true } } })

      const result = await getCategories(Modes.CHECKLISTS)
      const sub = result.data?.find((c: any) => c.path === 'Bob Work/Sub')

      expect(sub?.count).toBe(1)
      expect(result.data).toHaveLength(2)
    })

    it('should keep filtering subfolders the viewer has no grant on', async () => {
      mockMountsFor.mockResolvedValue([explicitMount])
      mockCatAccess.mockResolvedValue({ users: { someoneelse: { canEdit: true } } })

      const result = await getCategories(Modes.CHECKLISTS)

      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].count).toBe(2)
    })

    it('should leave implicit mount counts on their item uuids', async () => {
      mockMountsFor.mockResolvedValue([
        {
          ...explicitMount,
          isImplicit: true,
          itemUuids: ['a', 'b', 'c'],
        },
      ])

      const result = await getCategories(Modes.CHECKLISTS)

      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].count).toBe(3)
      expect(mockServerReadDir).not.toHaveBeenCalledWith(ownerDir)
    })

    it('should report zero when the shared folder cannot be listed', async () => {
      mockMountsFor.mockResolvedValue([explicitMount])
      mockServerReadDir.mockRejectedValue(new Error('EACCES'))

      const result = await getCategories(Modes.CHECKLISTS)

      expect(result.data?.[0].count).toBe(0)
    })
  })
})
