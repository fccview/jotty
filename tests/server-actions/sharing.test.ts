import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockFs, resetAllMocks } from '../setup'

const mockReadJsonFile = vi.fn()
const mockWriteJsonFile = vi.fn()
const mockEnsureDir = vi.fn()
const mockIsAdmin = vi.fn()
const mockLogAudit = vi.fn()

vi.mock('@/app/_server/actions/file', () => ({
  readJsonFile: (...args: any[]) => mockReadJsonFile(...args),
  writeJsonFile: (...args: any[]) => mockWriteJsonFile(...args),
  ensureDir: (...args: any[]) => mockEnsureDir(...args),
}))

vi.mock('@/app/_server/actions/users', () => ({
  isAdmin: (...args: any[]) => mockIsAdmin(...args),
  getUserByChecklist: vi.fn().mockResolvedValue({ success: false }),
  getUserByNote: vi.fn().mockResolvedValue({ success: false }),
}))

vi.mock('@/app/_server/actions/log', () => ({
  logAudit: (...args: any[]) => mockLogAudit(...args),
}))

vi.mock('@/app/_utils/yaml-metadata-utils', () => ({
  extractUuid: vi.fn().mockReturnValue('test-uuid-123'),
}))

import {
  shareWith,
  isItemSharedWith,
  getItemPermissions,
  canUserReadItem,
  canUserWriteItem,
  canUserDeleteItem,
  unshareWith,
  getAllSharedItemsForUser,
  updateItemPermissions,
} from '@/app/_server/actions/sharing'
import { ItemTypes, PermissionTypes } from '@/app/_types/enums'

describe('Sharing Actions', () => {
  beforeEach(() => {
    resetAllMocks()
    mockReadJsonFile.mockResolvedValue({})
    mockWriteJsonFile.mockResolvedValue(undefined)
    mockEnsureDir.mockResolvedValue(undefined)
    mockIsAdmin.mockResolvedValue(false)
    mockLogAudit.mockResolvedValue(undefined)
    mockFs.readFile.mockResolvedValue('---\nuuid: test-uuid-123\n---\nContent')
    mockFs.access.mockRejectedValue(new Error('ENOENT'))
  })

  describe('shareWith', () => {
    it('should share item successfully', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await shareWith(
        'test-item',
        'TestCategory',
        'sharer',
        'receiver',
        ItemTypes.CHECKLIST,
        { canRead: true, canEdit: false, canDelete: false }
      )

      expect(result.success).toBe(true)
      expect(mockWriteJsonFile).toHaveBeenCalled()
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'item_shared',
        success: true,
      }))
    })

    it('should add to existing shares for user', async () => {
      mockReadJsonFile.mockResolvedValue({
        receiver: [
          { uuid: 'existing-uuid', id: 'existing-item', sharer: 'other-sharer', permissions: { canRead: true } },
        ],
      })

      const result = await shareWith(
        'new-item',
        'TestCategory',
        'sharer',
        'receiver',
        ItemTypes.CHECKLIST,
        { canRead: true, canEdit: true, canDelete: false }
      )

      expect(result.success).toBe(true)
    })

    it('should update permissions for already shared item', async () => {
      mockReadJsonFile.mockResolvedValue({
        receiver: [
          { uuid: 'test-uuid-123', id: 'test-item', sharer: 'sharer', permissions: { canRead: true, canEdit: false, canDelete: false } },
        ],
      })

      const result = await shareWith(
        'test-item',
        'TestCategory',
        'sharer',
        'receiver',
        ItemTypes.CHECKLIST,
        { canRead: true, canEdit: true, canDelete: true }
      )

      expect(result.success).toBe(true)
    })

    it('should return error when UUID cannot be found', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))

      const result = await shareWith(
        'nonexistent-item',
        'TestCategory',
        'sharer',
        'receiver',
        ItemTypes.CHECKLIST,
        { canRead: true, canEdit: false, canDelete: false }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('needs to be saved first')
    })
  })

  describe('isItemSharedWith', () => {
    it('should return false when item not shared', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await isItemSharedWith('item-id', 'Category', ItemTypes.CHECKLIST, 'user')

      expect(result).toBe(false)
    })

    it('should find item by uuid (primary lookup)', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'shared-uuid', id: 'different-id', sharer: 'sharer', permissions: { canRead: true } }],
      })

      const result = await isItemSharedWith('shared-uuid', 'Category', ItemTypes.CHECKLIST, 'user')

      expect(result).toBe(true)
    })

    it('should find item by uuid even when category does not match', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'shared-uuid', id: 'item-id', category: 'DifferentCategory', sharer: 'sharer', permissions: { canRead: true } }],
      })

      const result = await isItemSharedWith('shared-uuid', 'WrongCategory', ItemTypes.CHECKLIST, 'user')

      expect(result).toBe(true)
    })

    it('should fallback to id+category only when uuid not found', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'some-uuid', id: 'item-id', category: 'Category', sharer: 'sharer', permissions: { canRead: true } }],
      })

      const result = await isItemSharedWith('item-id', 'Category', ItemTypes.CHECKLIST, 'user')

      expect(result).toBe(true)
    })

    it('should not match by id alone without matching category', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'some-uuid', id: 'item-id', category: 'Category', sharer: 'sharer', permissions: { canRead: true } }],
      })

      const result = await isItemSharedWith('item-id', 'DifferentCategory', ItemTypes.CHECKLIST, 'user')

      expect(result).toBe(false)
    })
  })

  describe('getItemPermissions', () => {
    it('should return null when item not shared', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await getItemPermissions('item-id', 'Category', ItemTypes.CHECKLIST, 'user')

      expect(result).toBeNull()
    })

    it('should find permissions by uuid (primary lookup)', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{
          uuid: 'shared-uuid',
          id: 'different-id',
          sharer: 'sharer',
          permissions: { canRead: true, canEdit: true, canDelete: false },
        }],
      })

      const result = await getItemPermissions('shared-uuid', 'WrongCategory', ItemTypes.CHECKLIST, 'user')

      expect(result).toEqual({ canRead: true, canEdit: true, canDelete: false })
    })

    it('should fallback to id+category when uuid not found', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{
          uuid: 'other-uuid',
          id: 'item-id',
          category: 'Category',
          sharer: 'sharer',
          permissions: { canRead: true, canEdit: false, canDelete: true },
        }],
      })

      const result = await getItemPermissions('item-id', 'Category', ItemTypes.CHECKLIST, 'user')

      expect(result).toEqual({ canRead: true, canEdit: false, canDelete: true })
    })
  })

  describe('canUserReadItem', () => {
    it('should return false when not shared', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await canUserReadItem('item', 'Category', ItemTypes.NOTE, 'user')

      expect(result).toBe(false)
    })

    it('should return true when canRead is true', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: true, canEdit: false, canDelete: false } }],
      })

      const result = await canUserReadItem('item', 'Category', ItemTypes.NOTE, 'user')

      expect(result).toBe(true)
    })
  })

  describe('canUserWriteItem', () => {
    it('should return false when canEdit is false', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: true, canEdit: false, canDelete: false } }],
      })

      const result = await canUserWriteItem('item', 'Category', ItemTypes.NOTE, 'user')

      expect(result).toBe(false)
    })

    it('should return true when canEdit is true', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: true, canEdit: true, canDelete: false } }],
      })

      const result = await canUserWriteItem('item', 'Category', ItemTypes.NOTE, 'user')

      expect(result).toBe(true)
    })
  })

  describe('canUserDeleteItem', () => {
    it('should return false when canDelete is false', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: true, canEdit: true, canDelete: false } }],
      })

      const result = await canUserDeleteItem('item', 'Category', ItemTypes.NOTE, 'user')

      expect(result).toBe(false)
    })

    it('should return true when canDelete is true', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: true, canEdit: true, canDelete: true } }],
      })

      const result = await canUserDeleteItem('item', 'Category', ItemTypes.NOTE, 'user')

      expect(result).toBe(true)
    })
  })

  describe('unshareWith', () => {
    it('should remove share entry', async () => {
      mockReadJsonFile.mockResolvedValue({
        receiver: [
          { uuid: 'item-uuid', id: 'item', sharer: 'sharer', permissions: { canRead: true } },
        ],
      })

      const result = await unshareWith('item-uuid', 'Category', 'sharer', 'receiver', ItemTypes.CHECKLIST)

      expect(result.success).toBe(true)
      expect(mockWriteJsonFile).toHaveBeenCalled()
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'item_unshared',
        success: true,
      }))
    })

    it('should remove user key when no shares left', async () => {
      mockReadJsonFile.mockResolvedValue({
        receiver: [
          { uuid: 'only-item', id: 'item', sharer: 'sharer', permissions: { canRead: true } },
        ],
      })

      await unshareWith('only-item', 'Category', 'sharer', 'receiver', ItemTypes.CHECKLIST)

      const writeCall = mockWriteJsonFile.mock.calls[0]
      expect(writeCall[0]).not.toHaveProperty('receiver')
    })
  })

  describe('getAllSharedItemsForUser', () => {
    it('should return empty arrays when nothing shared', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await getAllSharedItemsForUser('user')

      expect(result).toEqual({ notes: [], checklists: [] })
    })

    it('should return shared items for user', async () => {
      mockReadJsonFile
        .mockResolvedValueOnce({
          user: [{ uuid: 'note-1', id: 'note', sharer: 'sharer', permissions: { canRead: true } }],
        })
        .mockResolvedValueOnce({
          user: [{ uuid: 'checklist-1', id: 'checklist', sharer: 'sharer', permissions: { canRead: true } }],
        })

      const result = await getAllSharedItemsForUser('user')

      expect(result.notes).toHaveLength(1)
      expect(result.checklists).toHaveLength(1)
    })
  })

  describe('updateItemPermissions', () => {
    it('should return error when item not shared', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await updateItemPermissions(
        'item',
        'Category',
        ItemTypes.CHECKLIST,
        'user',
        { canRead: true, canEdit: true, canDelete: true }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Item not shared with this user')
    })

    it('should update permissions successfully', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', id: 'item', sharer: 'sharer', permissions: { canRead: true, canEdit: false, canDelete: false } }],
      })

      const result = await updateItemPermissions(
        'item',
        'Category',
        ItemTypes.CHECKLIST,
        'user',
        { canRead: true, canEdit: true, canDelete: true }
      )

      expect(result.success).toBe(true)
      expect(mockWriteJsonFile).toHaveBeenCalled()
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'share_permissions_updated',
        success: true,
      }))
    })
  })
})
