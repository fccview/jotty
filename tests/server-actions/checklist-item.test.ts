import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockRevalidatePath, resetAllMocks, createFormData } from '../setup'

const mockGetUserModeDir = vi.fn()
const mockEnsureDir = vi.fn()
const mockServerWriteFile = vi.fn()
const mockGetUsername = vi.fn()
const mockIsAdmin = vi.fn()
const mockCheckUserPermission = vi.fn()
const mockGetUserChecklists = vi.fn()
const mockGetListById = vi.fn()
const mockGetAllLists = vi.fn()

vi.mock('@/app/_server/actions/file', () => ({
  getUserModeDir: (...args: any[]) => mockGetUserModeDir(...args),
  ensureDir: (...args: any[]) => mockEnsureDir(...args),
  serverWriteFile: (...args: any[]) => mockServerWriteFile(...args),
}))

vi.mock('@/app/_server/actions/users', () => ({
  getUsername: (...args: any[]) => mockGetUsername(...args),
  isAdmin: (...args: any[]) => mockIsAdmin(...args),
}))

vi.mock('@/app/_server/actions/sharing', () => ({
  checkUserPermission: (...args: any[]) => mockCheckUserPermission(...args),
}))

vi.mock('@/app/_server/actions/checklist', () => ({
  getUserChecklists: (...args: any[]) => mockGetUserChecklists(...args),
  getListById: (...args: any[]) => mockGetListById(...args),
  getAllLists: (...args: any[]) => mockGetAllLists(...args),
}))

vi.mock('@/app/_utils/checklist-utils', () => ({
  listToMarkdown: vi.fn().mockReturnValue('# Test List\n- [ ] Item'),
}))

import {
  updateItem,
  createItem,
  deleteItem,
  updateItemStatus,
  createBulkItems,
  createSubItem,
} from '@/app/_server/actions/checklist-item'

const mockChecklist = {
  id: 'test-list',
  uuid: 'test-uuid-123',
  title: 'Test List',
  category: 'TestCategory',
  owner: 'testuser',
  type: 'simple' as const,
  items: [
    { id: 'item-1', text: 'First item', completed: false, order: 0 },
    { id: 'item-2', text: 'Second item', completed: true, order: 1 },
  ],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('Checklist Item Actions', () => {
  beforeEach(() => {
    resetAllMocks()
    mockGetUserModeDir.mockResolvedValue('/data/checklists/testuser')
    mockEnsureDir.mockResolvedValue(undefined)
    mockServerWriteFile.mockResolvedValue(undefined)
    mockGetUsername.mockResolvedValue('testuser')
    mockIsAdmin.mockResolvedValue(false)
    mockCheckUserPermission.mockResolvedValue(true)
    mockGetUserChecklists.mockResolvedValue({ success: true, data: [mockChecklist] })
    mockGetListById.mockResolvedValue(mockChecklist)
    mockGetAllLists.mockResolvedValue({ success: true, data: [mockChecklist] })
  })

  describe('updateItem', () => {
    it('should update item text', async () => {
      const formData = createFormData({
        listId: 'test-list',
        itemId: 'item-1',
        completed: 'false',
        text: 'Updated item text',
        category: 'TestCategory',
      })

      const result = await updateItem(mockChecklist, formData)

      expect(result.success).toBe(true)
      expect(mockServerWriteFile).toHaveBeenCalled()
    })

    it('should mark item as completed', async () => {
      const formData = createFormData({
        listId: 'test-list',
        itemId: 'item-1',
        completed: 'true',
        category: 'TestCategory',
      })

      const result = await updateItem(mockChecklist, formData)

      expect(result.success).toBe(true)
      const updatedItem = result.data?.items.find((i: any) => i.id === 'item-1')
      expect(updatedItem?.completed).toBe(true)
    })

    it('should update item description', async () => {
      const formData = createFormData({
        listId: 'test-list',
        itemId: 'item-1',
        completed: 'false',
        description: 'New description',
        category: 'TestCategory',
      })

      const result = await updateItem(mockChecklist, formData)

      expect(result.success).toBe(true)
    })

    it('should return error when permission denied', async () => {
      mockCheckUserPermission.mockResolvedValue(false)

      const formData = createFormData({
        listId: 'test-list',
        itemId: 'item-1',
        completed: 'false',
        category: 'TestCategory',
      })

      const result = await updateItem(mockChecklist, formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update item')
    })

    it('should skip revalidation when flag is set', async () => {
      const formData = createFormData({
        listId: 'test-list',
        itemId: 'item-1',
        completed: 'true',
        category: 'TestCategory',
      })

      await updateItem(mockChecklist, formData, 'testuser', true)

      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })
  })

  describe('createItem', () => {
    it('should create a new item', async () => {
      const formData = createFormData({
        listId: 'test-list',
        text: 'New item',
        category: 'TestCategory',
      })

      const result = await createItem(mockChecklist, formData)

      expect(result.success).toBe(true)
      expect(result.data?.text).toBe('New item')
      expect(result.data?.completed).toBe(false)
      expect(mockServerWriteFile).toHaveBeenCalled()
    })

    it('should create item with description', async () => {
      const formData = createFormData({
        listId: 'test-list',
        text: 'New item with desc',
        description: 'Item description',
        category: 'TestCategory',
      })

      const result = await createItem(mockChecklist, formData)

      expect(result.success).toBe(true)
      expect(result.data?.description).toBe('Item description')
    })

    it('should return error when permission denied', async () => {
      mockCheckUserPermission.mockResolvedValue(false)

      const formData = createFormData({
        listId: 'test-list',
        text: 'New item',
        category: 'TestCategory',
      })

      const result = await createItem(mockChecklist, formData)

      expect(result.success).toBe(false)
    })

    it('should create task item with status for task checklists', async () => {
      const taskChecklist = { ...mockChecklist, type: 'task' as const }

      const formData = createFormData({
        listId: 'test-list',
        text: 'New task',
        category: 'TestCategory',
      })

      const result = await createItem(taskChecklist, formData)

      expect(result.success).toBe(true)
      expect(result.data?.status).toBeDefined()
    })
  })

  describe('deleteItem', () => {
    it('should delete an item', async () => {
      const formData = createFormData({
        listId: 'test-list',
        itemId: 'item-1',
        category: 'TestCategory',
      })

      const result = await deleteItem(formData)

      expect(result.success).toBe(true)
      expect(mockServerWriteFile).toHaveBeenCalled()
    })

    it('should return success when item does not exist', async () => {
      const formData = createFormData({
        listId: 'test-list',
        itemId: 'nonexistent-item',
        category: 'TestCategory',
      })

      const result = await deleteItem(formData)

      expect(result.success).toBe(true)
    })

    it('should handle list not found', async () => {
      mockGetUserChecklists.mockResolvedValue({ success: true, data: [] })

      const formData = createFormData({
        listId: 'nonexistent-list',
        itemId: 'item-1',
        category: 'TestCategory',
      })

      const result = await deleteItem(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to delete item')
    })
  })

  describe('updateItemStatus', () => {
    const taskChecklist = {
      ...mockChecklist,
      type: 'task' as const,
      items: [
        { id: 'task-1', text: 'Task item', completed: false, order: 0, status: 'todo' },
      ],
    }

    beforeEach(() => {
      mockGetListById.mockResolvedValue(taskChecklist)
    })

    it('should return error when listId or itemId missing', async () => {
      const formData = createFormData({
        status: 'in-progress',
      })

      const result = await updateItemStatus(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('List ID and item ID are required')
    })

    it('should return error when neither status nor timeEntries provided', async () => {
      const formData = createFormData({
        listId: 'test-list',
        itemId: 'task-1',
        category: 'TestCategory',
      })

      const result = await updateItemStatus(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Either status or timeEntries must be provided')
    })

    it('should update item status', async () => {
      const formData = createFormData({
        listId: 'test-list',
        itemId: 'task-1',
        status: 'in-progress',
        category: 'TestCategory',
      })

      const result = await updateItemStatus(formData)

      expect(result.success).toBe(true)
      expect(mockServerWriteFile).toHaveBeenCalled()
    })

    it('should return error when permission denied', async () => {
      mockCheckUserPermission.mockResolvedValue(false)

      const formData = createFormData({
        listId: 'test-list',
        itemId: 'task-1',
        status: 'in-progress',
        category: 'TestCategory',
      })

      const result = await updateItemStatus(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Permission denied')
    })

    it('should return error when list not found', async () => {
      mockGetListById.mockResolvedValue(null)

      const formData = createFormData({
        listId: 'nonexistent-list',
        itemId: 'task-1',
        status: 'in-progress',
        category: 'TestCategory',
      })

      const result = await updateItemStatus(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('List not found')
    })
  })

  describe('createBulkItems', () => {
    it('should create multiple items from text', async () => {
      const formData = createFormData({
        listId: 'test-list',
        itemsText: 'Item 1\nItem 2\nItem 3',
        category: 'TestCategory',
      })

      const result = await createBulkItems(formData)

      expect(result.success).toBe(true)
      expect(result.data?.items.length).toBeGreaterThan(mockChecklist.items.length)
      expect(mockServerWriteFile).toHaveBeenCalled()
    })

    it('should filter empty lines', async () => {
      const formData = createFormData({
        listId: 'test-list',
        itemsText: 'Item 1\n\n\nItem 2',
        category: 'TestCategory',
      })

      const result = await createBulkItems(formData)

      expect(result.success).toBe(true)
    })

    it('should handle list not found', async () => {
      mockGetUserChecklists.mockResolvedValue({ success: true, data: [] })

      const formData = createFormData({
        listId: 'nonexistent-list',
        itemsText: 'Item 1',
        category: 'TestCategory',
      })

      const result = await createBulkItems(formData)

      expect(result.success).toBe(false)
    })
  })

  describe('createSubItem', () => {
    it('should create a sub-item under parent', async () => {
      const formData = createFormData({
        listId: 'test-list',
        parentId: 'item-1',
        text: 'Sub item',
        category: 'TestCategory',
      })

      const result = await createSubItem(formData)

      expect(result.success).toBe(true)
      expect(mockServerWriteFile).toHaveBeenCalled()
    })

    it('should return error when parent not found', async () => {
      const formData = createFormData({
        listId: 'test-list',
        parentId: 'nonexistent-parent',
        text: 'Sub item',
        category: 'TestCategory',
      })

      const result = await createSubItem(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create sub-item')
    })

    it('should handle list not found', async () => {
      mockGetUserChecklists.mockResolvedValue({ success: true, data: [] })
      mockGetAllLists.mockResolvedValue({ success: true, data: [] })

      const formData = createFormData({
        listId: 'nonexistent-list',
        parentId: 'item-1',
        text: 'Sub item',
        category: 'TestCategory',
      })

      const result = await createSubItem(formData)

      expect(result.success).toBe(false)
    })
  })
})
