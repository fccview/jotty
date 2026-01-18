import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockFs, mockRevalidatePath, resetAllMocks, createFormData } from '../setup'

const mockGetUserModeDir = vi.fn()
const mockEnsureDir = vi.fn()
const mockServerWriteFile = vi.fn()
const mockServerDeleteFile = vi.fn()
const mockServerReadDir = vi.fn()
const mockServerReadFile = vi.fn()
const mockReadOrderFile = vi.fn()
const mockGetCurrentUser = vi.fn()
const mockCheckUserPermission = vi.fn()
const mockLogContentEvent = vi.fn()
const mockParseInternalLinks = vi.fn()
const mockUpdateIndexForItem = vi.fn()
const mockRemoveItemFromIndex = vi.fn()

vi.mock('@/app/_server/actions/file', () => ({
  getUserModeDir: (...args: any[]) => mockGetUserModeDir(...args),
  ensureDir: (...args: any[]) => mockEnsureDir(...args),
  serverWriteFile: (...args: any[]) => mockServerWriteFile(...args),
  serverDeleteFile: (...args: any[]) => mockServerDeleteFile(...args),
  serverReadDir: (...args: any[]) => mockServerReadDir(...args),
  serverReadFile: (...args: any[]) => mockServerReadFile(...args),
  readOrderFile: (...args: any[]) => mockReadOrderFile(...args),
  readJsonFile: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/app/_server/actions/users', () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  isAdmin: vi.fn().mockResolvedValue(false),
  getUsername: vi.fn().mockResolvedValue('testuser'),
}))

vi.mock('@/app/_server/actions/sharing', () => ({
  checkUserPermission: (...args: any[]) => mockCheckUserPermission(...args),
  getAllSharedItemsForUser: vi.fn().mockResolvedValue({ notes: [], checklists: [] }),
  updateSharingData: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/app/_server/actions/log', () => ({
  logContentEvent: (...args: any[]) => mockLogContentEvent(...args),
}))

vi.mock('@/app/_server/actions/link', () => ({
  parseInternalLinks: (...args: any[]) => mockParseInternalLinks(...args),
  updateIndexForItem: (...args: any[]) => mockUpdateIndexForItem(...args),
  removeItemFromIndex: (...args: any[]) => mockRemoveItemFromIndex(...args),
  rebuildLinkIndex: vi.fn().mockResolvedValue(undefined),
  updateItemCategory: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/app/_utils/checklist-utils', () => ({
  parseMarkdown: vi.fn().mockReturnValue({
    id: 'test-list',
    title: 'Test List',
    items: [],
    category: 'TestCategory',
  }),
  listToMarkdown: vi.fn().mockReturnValue('# Test List\n'),
}))

vi.mock('@/app/_utils/filename-utils', () => ({
  generateUniqueFilename: vi.fn().mockResolvedValue('test-list.md'),
  sanitizeFilename: vi.fn().mockReturnValue('test-list'),
}))

vi.mock('@/app/_utils/yaml-metadata-utils', () => ({
  generateUuid: vi.fn().mockReturnValue('test-uuid-123'),
  generateYamlFrontmatter: vi.fn().mockReturnValue('---\nuuid: test-uuid-123\n---\n'),
  extractYamlMetadata: vi.fn().mockReturnValue({ metadata: { uuid: 'test-uuid-123' }, contentWithoutMetadata: '' }),
  updateYamlMetadata: vi.fn().mockReturnValue('---\nuuid: test-uuid-123\n---\n'),
  extractChecklistType: vi.fn().mockReturnValue('simple'),
}))

import { createList, deleteList } from '@/app/_server/actions/checklist'

describe('Checklist Actions', () => {
  beforeEach(() => {
    resetAllMocks()
    mockGetUserModeDir.mockResolvedValue('/data/checklists/testuser')
    mockEnsureDir.mockResolvedValue(undefined)
    mockServerWriteFile.mockResolvedValue(undefined)
    mockServerDeleteFile.mockResolvedValue(undefined)
    mockServerReadDir.mockResolvedValue([])
    mockServerReadFile.mockResolvedValue('')
    mockReadOrderFile.mockResolvedValue(null)
    mockGetCurrentUser.mockResolvedValue({ username: 'testuser', fileRenameMode: 'minimal' })
    mockCheckUserPermission.mockResolvedValue(true)
    mockLogContentEvent.mockResolvedValue(undefined)
    mockParseInternalLinks.mockResolvedValue([])
    mockUpdateIndexForItem.mockResolvedValue(undefined)
    mockRemoveItemFromIndex.mockResolvedValue(undefined)
  })

  describe('createList', () => {
    it('should create a new checklist successfully', async () => {
      const formData = createFormData({
        title: 'My New List',
        category: 'TestCategory',
        type: 'simple',
      })

      const result = await createList(formData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.title).toBe('My New List')
      expect(result.data?.category).toBe('TestCategory')
      expect(result.data?.type).toBe('simple')
      expect(mockEnsureDir).toHaveBeenCalled()
      expect(mockServerWriteFile).toHaveBeenCalled()
    })

    it('should default to Uncategorized when no category provided', async () => {
      const formData = createFormData({
        title: 'Uncategorized List',
        type: 'simple',
      })

      const result = await createList(formData)

      expect(result.success).toBe(true)
      expect(result.data?.category).toBe('Uncategorized')
    })

    it('should create a task checklist', async () => {
      const formData = createFormData({
        title: 'Task List',
        category: 'Tasks',
        type: 'task',
      })

      const result = await createList(formData)

      expect(result.success).toBe(true)
      expect(result.data?.type).toBe('task')
    })

    it('should log content event on creation', async () => {
      const formData = createFormData({
        title: 'Logged List',
        category: 'TestCategory',
        type: 'simple',
      })

      await createList(formData)

      expect(mockLogContentEvent).toHaveBeenCalledWith(
        'checklist_created',
        'checklist',
        expect.any(String),
        'Logged List',
        true,
        expect.objectContaining({ category: 'TestCategory' })
      )
    })

    it('should update link index after creation', async () => {
      const formData = createFormData({
        title: 'Linked List',
        category: 'TestCategory',
        type: 'simple',
      })

      await createList(formData)

      expect(mockUpdateIndexForItem).toHaveBeenCalled()
    })

    it('should handle creation errors gracefully', async () => {
      mockServerWriteFile.mockRejectedValue(new Error('Write failed'))

      const formData = createFormData({
        title: 'Failed List',
        category: 'TestCategory',
        type: 'simple',
      })

      const result = await createList(formData)

      expect(result.error).toBe('Failed to create list')
    })
  })

  describe('deleteList', () => {
    beforeEach(() => {
      vi.doMock('@/app/_server/actions/checklist', async (importOriginal) => {
        const original = await importOriginal() as any
        return {
          ...original,
          getListById: vi.fn().mockResolvedValue({
            id: 'test-list',
            uuid: 'test-uuid-123',
            title: 'Test List',
            category: 'TestCategory',
            owner: 'testuser',
            items: [],
          }),
          getUserChecklists: vi.fn().mockResolvedValue({
            success: true,
            data: [{
              id: 'test-list',
              uuid: 'test-uuid-123',
              title: 'Test List',
              category: 'TestCategory',
              owner: 'testuser',
              items: [],
            }],
          }),
        }
      })
    })

    it('should return error when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const formData = createFormData({
        id: 'test-list',
        category: 'TestCategory',
      })

      const result = await deleteList(formData)

      expect(result.error).toBe('Not authenticated')
    })

    it('should return error when permission denied', async () => {
      mockCheckUserPermission.mockResolvedValue(false)

      const formData = createFormData({
        id: 'test-list',
        category: 'TestCategory',
      })

      const result = await deleteList(formData)

      expect(result.error).toBeDefined()
    })
  })
})
