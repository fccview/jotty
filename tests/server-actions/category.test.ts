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

vi.mock('@/app/_server/actions/file', () => ({
  ensureDir: (...args: any[]) => mockEnsureDir(...args),
  serverDeleteDir: (...args: any[]) => mockServerDeleteDir(...args),
  getUserModeDir: (...args: any[]) => mockGetUserModeDir(...args),
  readOrderFile: (...args: any[]) => mockReadOrderFile(...args),
  writeOrderFile: (...args: any[]) => mockWriteOrderFile(...args),
}))

vi.mock('@/app/_server/actions/log', () => ({
  logAudit: (...args: any[]) => mockLogAudit(...args),
}))

vi.mock('@/app/_server/actions/users', () => ({
  getUsername: vi.fn().mockResolvedValue('testuser'),
}))

vi.mock('@/app/_utils/category-utils', () => ({
  buildCategoryTree: vi.fn().mockResolvedValue([]),
}))

import {
  createCategory,
  deleteCategory,
  renameCategory,
  getCategories,
  setCategoryOrder,
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

  describe('setCategoryOrder', () => {
    it('should set category order successfully', async () => {
      const formData = createFormData({
        mode: Modes.CHECKLISTS,
        parent: '',
        categories: JSON.stringify(['cat1', 'cat2', 'cat3']),
      })

      const result = await setCategoryOrder(formData)

      expect(result).toEqual({ success: true })
      expect(mockWriteOrderFile).toHaveBeenCalled()
    })

    it('should preserve existing item order', async () => {
      mockReadOrderFile.mockResolvedValue({
        categories: ['old1', 'old2'],
        items: ['item1', 'item2'],
      })

      const formData = createFormData({
        mode: Modes.CHECKLISTS,
        parent: '',
        categories: JSON.stringify(['cat1', 'cat2']),
      })

      await setCategoryOrder(formData)

      expect(mockWriteOrderFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          categories: ['cat1', 'cat2'],
          items: ['item1', 'item2'],
        })
      )
    })

    it('should handle write errors', async () => {
      mockWriteOrderFile.mockResolvedValue({ success: false })

      const formData = createFormData({
        mode: Modes.CHECKLISTS,
        parent: '',
        categories: JSON.stringify(['cat1']),
      })

      const result = await setCategoryOrder(formData)

      expect(result).toEqual({ error: 'Failed to write order' })
    })
  })
})
