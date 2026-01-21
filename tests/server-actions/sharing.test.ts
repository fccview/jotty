import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockFs, resetAllMocks } from '../setup'

const mockReadJsonFile = vi.fn()
const mockWriteJsonFile = vi.fn()
const mockEnsureDir = vi.fn()
const mockIsAdmin = vi.fn()
const mockLogAudit = vi.fn()
const mockGetUserByChecklist = vi.fn()
const mockGetUserByNote = vi.fn()
const mockGetUserByChecklistUuid = vi.fn()
const mockGetUserByNoteUuid = vi.fn()

vi.mock('@/app/_server/actions/file', () => ({
  readJsonFile: (...args: any[]) => mockReadJsonFile(...args),
  writeJsonFile: (...args: any[]) => mockWriteJsonFile(...args),
  ensureDir: (...args: any[]) => mockEnsureDir(...args),
}))

vi.mock('@/app/_server/actions/users', () => ({
  isAdmin: (...args: any[]) => mockIsAdmin(...args),
  getUserByChecklist: (...args: any[]) => mockGetUserByChecklist(...args),
  getUserByNote: (...args: any[]) => mockGetUserByNote(...args),
  getUserByChecklistUuid: (...args: any[]) => mockGetUserByChecklistUuid(...args),
  getUserByNoteUuid: (...args: any[]) => mockGetUserByNoteUuid(...args),
}))

vi.mock('@/app/_server/actions/log', () => ({
  logAudit: (...args: any[]) => mockLogAudit(...args),
}))

vi.mock('@/app/_utils/yaml-metadata-utils', () => ({
  extractUuid: vi.fn().mockReturnValue('test-uuid-123'),
}))

vi.mock('@/app/_utils/global-utils', () => ({
  encodeCategoryPath: vi.fn((path: string) => path),
}))

import {
  shareWith,
  isItemSharedWith,
  getItemPermissions,
  canUserReadItem,
  canUserWriteItem,
  canUserDeleteItem,
  checkUserPermission,
  unshareWith,
  getAllSharedItemsForUser,
  getAllSharedItems,
  updateSharingData,
  updateItemPermissions,
  updateReceiverUsername,
  readShareFile,
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
    mockGetUserByChecklist.mockResolvedValue({ success: false })
    mockGetUserByNote.mockResolvedValue({ success: false })
    mockGetUserByChecklistUuid.mockResolvedValue({ success: false })
    mockGetUserByNoteUuid.mockResolvedValue({ success: false })
    mockFs.readFile.mockResolvedValue('---\nuuid: test-uuid-123\n---\nContent')
    mockFs.access.mockRejectedValue(new Error('ENOENT'))
  })

  describe('shareWith', () => {
    it('should share item successfully with default permissions', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await shareWith(
        'test-item',
        'TestCategory',
        'sharer',
        'receiver',
        ItemTypes.CHECKLIST
      )

      expect(result.success).toBe(true)
      expect(mockWriteJsonFile).toHaveBeenCalled()
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'item_shared',
        success: true,
      }))
    })

    it('should share item with custom permissions', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await shareWith(
        'test-item',
        'TestCategory',
        'sharer',
        'receiver',
        ItemTypes.CHECKLIST,
        { canRead: true, canEdit: true, canDelete: false }
      )

      expect(result.success).toBe(true)
      expect(mockWriteJsonFile).toHaveBeenCalled()
    })

    it('should share item with full permissions', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await shareWith(
        'test-item',
        'TestCategory',
        'sharer',
        'receiver',
        ItemTypes.NOTE,
        { canRead: true, canEdit: true, canDelete: true }
      )

      expect(result.success).toBe(true)
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

    it('should replace existing share from same sharer', async () => {
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
        { canRead: true, canEdit: true, canDelete: false }
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

    it('should handle write errors gracefully', async () => {
      mockReadJsonFile.mockResolvedValue({})
      mockWriteJsonFile.mockRejectedValue(new Error('Write failed'))

      const result = await shareWith(
        'test-item',
        'TestCategory',
        'sharer',
        'receiver',
        ItemTypes.CHECKLIST
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to share item')
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'item_shared',
        success: false,
      }))
    })

    it('should share note items', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await shareWith(
        'test-note',
        'Notes',
        'sharer',
        'receiver',
        ItemTypes.NOTE
      )

      expect(result.success).toBe(true)
    })

    it('should handle uncategorized items', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await shareWith(
        'test-item',
        '',
        'sharer',
        'receiver',
        ItemTypes.CHECKLIST
      )

      expect(result.success).toBe(true)
    })
  })

  describe('isItemSharedWith', () => {
    it('should return false when item not shared', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await isItemSharedWith('item-id', 'Category', ItemTypes.CHECKLIST, 'user')

      expect(result).toBe(false)
    })

    it('should return false when user has no shares', async () => {
      mockReadJsonFile.mockResolvedValue({
        otheruser: [{ uuid: 'item-id', permissions: { canRead: true } }],
      })

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

    it('should handle empty category path', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item-id', id: 'item-id', category: 'Uncategorized', sharer: 'sharer', permissions: { canRead: true } }],
      })

      const result = await isItemSharedWith('item-id', '', ItemTypes.CHECKLIST, 'user')

      expect(result).toBe(true)
    })

    it('should work with note items', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'note-uuid', permissions: { canRead: true } }],
      })

      const result = await isItemSharedWith('note-uuid', 'Category', ItemTypes.NOTE, 'user')

      expect(result).toBe(true)
    })
  })

  describe('getItemPermissions', () => {
    it('should return null when item not shared', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await getItemPermissions('item-id', 'Category', ItemTypes.CHECKLIST, 'user')

      expect(result).toBeNull()
    })

    it('should return null when user has no shares', async () => {
      mockReadJsonFile.mockResolvedValue({
        otheruser: [{ uuid: 'item-id', permissions: { canRead: true } }],
      })

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

    it('should return read-only permissions', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{
          uuid: 'item-id',
          permissions: { canRead: true, canEdit: false, canDelete: false },
        }],
      })

      const result = await getItemPermissions('item-id', 'Category', ItemTypes.CHECKLIST, 'user')

      expect(result).toEqual({ canRead: true, canEdit: false, canDelete: false })
    })

    it('should return full permissions', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{
          uuid: 'item-id',
          permissions: { canRead: true, canEdit: true, canDelete: true },
        }],
      })

      const result = await getItemPermissions('item-id', 'Category', ItemTypes.CHECKLIST, 'user')

      expect(result).toEqual({ canRead: true, canEdit: true, canDelete: true })
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

    it('should return false when canRead is false', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: false, canEdit: false, canDelete: false } }],
      })

      const result = await canUserReadItem('item', 'Category', ItemTypes.NOTE, 'user')

      expect(result).toBe(false)
    })

    it('should work with checklists', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'checklist-id', permissions: { canRead: true, canEdit: false, canDelete: false } }],
      })

      const result = await canUserReadItem('checklist-id', 'Category', ItemTypes.CHECKLIST, 'user')

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

    it('should return false when not shared', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await canUserWriteItem('item', 'Category', ItemTypes.NOTE, 'user')

      expect(result).toBe(false)
    })

    it('should work with checklists', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'checklist-id', permissions: { canRead: true, canEdit: true, canDelete: false } }],
      })

      const result = await canUserWriteItem('checklist-id', 'Category', ItemTypes.CHECKLIST, 'user')

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

    it('should return false when not shared', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await canUserDeleteItem('item', 'Category', ItemTypes.NOTE, 'user')

      expect(result).toBe(false)
    })

    it('should work with checklists', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'checklist-id', permissions: { canRead: true, canEdit: true, canDelete: true } }],
      })

      const result = await canUserDeleteItem('checklist-id', 'Category', ItemTypes.CHECKLIST, 'user')

      expect(result).toBe(true)
    })
  })

  describe('checkUserPermission', () => {
    it('should return true for admin users', async () => {
      mockIsAdmin.mockResolvedValue(true)

      const result = await checkUserPermission('item', 'Category', ItemTypes.CHECKLIST, 'admin', PermissionTypes.READ)

      expect(result).toBe(true)
    })

    it('should return true when user owns the file', async () => {
      mockIsAdmin.mockResolvedValue(false)
      mockFs.access.mockResolvedValue(undefined)

      const result = await checkUserPermission('item', 'Category', ItemTypes.CHECKLIST, 'owner', PermissionTypes.READ)

      expect(result).toBe(true)
    })

    it('should check read permission for shared items', async () => {
      mockIsAdmin.mockResolvedValue(false)
      mockFs.access.mockRejectedValue(new Error('ENOENT'))
      mockGetUserByChecklistUuid.mockResolvedValue({ success: true, data: { username: 'owner' } })
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: true, canEdit: false, canDelete: false } }],
      })

      const result = await checkUserPermission('item', 'Category', ItemTypes.CHECKLIST, 'user', PermissionTypes.READ)

      expect(result).toBe(true)
    })

    it('should check edit permission for shared items', async () => {
      mockIsAdmin.mockResolvedValue(false)
      mockFs.access.mockRejectedValue(new Error('ENOENT'))
      mockGetUserByChecklistUuid.mockResolvedValue({ success: true, data: { username: 'owner' } })
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: true, canEdit: true, canDelete: false } }],
      })

      const result = await checkUserPermission('item', 'Category', ItemTypes.CHECKLIST, 'user', PermissionTypes.EDIT)

      expect(result).toBe(true)
    })

    it('should check delete permission for shared items', async () => {
      mockIsAdmin.mockResolvedValue(false)
      mockFs.access.mockRejectedValue(new Error('ENOENT'))
      mockGetUserByChecklistUuid.mockResolvedValue({ success: true, data: { username: 'owner' } })
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: true, canEdit: true, canDelete: true } }],
      })

      const result = await checkUserPermission('item', 'Category', ItemTypes.CHECKLIST, 'user', PermissionTypes.DELETE)

      expect(result).toBe(true)
    })

    it('should return false when permission denied', async () => {
      mockIsAdmin.mockResolvedValue(false)
      mockFs.access.mockRejectedValue(new Error('ENOENT'))
      mockGetUserByChecklistUuid.mockResolvedValue({ success: true, data: { username: 'owner' } })
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: true, canEdit: false, canDelete: false } }],
      })

      const result = await checkUserPermission('item', 'Category', ItemTypes.CHECKLIST, 'user', PermissionTypes.EDIT)

      expect(result).toBe(false)
    })

    it('should work with note items', async () => {
      mockIsAdmin.mockResolvedValue(false)
      mockFs.access.mockRejectedValue(new Error('ENOENT'))
      mockGetUserByNoteUuid.mockResolvedValue({ success: true, data: { username: 'owner' } })
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'note-id', permissions: { canRead: true, canEdit: false, canDelete: false } }],
      })

      const result = await checkUserPermission('note-id', 'Category', ItemTypes.NOTE, 'user', PermissionTypes.READ)

      expect(result).toBe(true)
    })

    it('should fallback to getUserByChecklist when uuid lookup fails', async () => {
      mockIsAdmin.mockResolvedValue(false)
      mockFs.access.mockRejectedValue(new Error('ENOENT'))
      mockGetUserByChecklistUuid.mockResolvedValue({ success: false })
      mockGetUserByChecklist.mockResolvedValue({ success: true, data: { username: 'owner' } })
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: true, canEdit: false, canDelete: false } }],
      })

      const result = await checkUserPermission('item', 'Category', ItemTypes.CHECKLIST, 'user', PermissionTypes.READ)

      expect(result).toBe(true)
    })

    it('should fallback to getUserByNote when uuid lookup fails', async () => {
      mockIsAdmin.mockResolvedValue(false)
      mockFs.access.mockRejectedValue(new Error('ENOENT'))
      mockGetUserByNoteUuid.mockResolvedValue({ success: false })
      mockGetUserByNote.mockResolvedValue({ success: true, data: { username: 'owner' } })
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'note-id', permissions: { canRead: true, canEdit: false, canDelete: false } }],
      })

      const result = await checkUserPermission('note-id', 'Category', ItemTypes.NOTE, 'user', PermissionTypes.READ)

      expect(result).toBe(true)
    })

    it('should return false when owner cannot be determined', async () => {
      mockIsAdmin.mockResolvedValue(false)
      mockFs.access.mockRejectedValue(new Error('ENOENT'))
      mockGetUserByChecklistUuid.mockResolvedValue({ success: false })
      mockGetUserByChecklist.mockResolvedValue({ success: false })

      const result = await checkUserPermission('item', 'Category', ItemTypes.CHECKLIST, 'user', PermissionTypes.READ)

      expect(result).toBe(false)
    })

    it('should return true when user is the owner', async () => {
      mockIsAdmin.mockResolvedValue(false)
      mockFs.access.mockRejectedValue(new Error('ENOENT'))
      mockGetUserByChecklistUuid.mockResolvedValue({ success: true, data: { username: 'user' } })

      const result = await checkUserPermission('item', 'Category', ItemTypes.CHECKLIST, 'user', PermissionTypes.READ)

      expect(result).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      mockIsAdmin.mockRejectedValue(new Error('Database error'))

      const result = await checkUserPermission('item', 'Category', ItemTypes.CHECKLIST, 'user', PermissionTypes.READ)

      expect(result).toBe(false)
    })
  })

  describe('unshareWith', () => {
    it('should remove share entry by uuid', async () => {
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

    it('should remove share entry by id and category', async () => {
      mockReadJsonFile.mockResolvedValue({
        receiver: [
          { uuid: 'other-uuid', id: 'item', category: 'Category', sharer: 'sharer', permissions: { canRead: true } },
        ],
      })

      const result = await unshareWith('item', 'Category', 'sharer', 'receiver', ItemTypes.CHECKLIST)

      expect(result.success).toBe(true)
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

    it('should keep other shares intact', async () => {
      mockReadJsonFile.mockResolvedValue({
        receiver: [
          { uuid: 'item-1', id: 'item-1', sharer: 'sharer', permissions: { canRead: true } },
          { uuid: 'item-2', id: 'item-2', sharer: 'sharer', permissions: { canRead: true } },
        ],
      })

      await unshareWith('item-1', 'Category', 'sharer', 'receiver', ItemTypes.CHECKLIST)

      const writeCall = mockWriteJsonFile.mock.calls[0]
      expect(writeCall[0].receiver).toHaveLength(1)
      expect(writeCall[0].receiver[0].uuid).toBe('item-2')
    })

    it('should handle non-existent shares gracefully', async () => {
      mockReadJsonFile.mockResolvedValue({
        receiver: [
          { uuid: 'other-item', id: 'other-item', sharer: 'sharer', permissions: { canRead: true } },
        ],
      })

      const result = await unshareWith('nonexistent', 'Category', 'sharer', 'receiver', ItemTypes.CHECKLIST)

      expect(result.success).toBe(true)
    })

    it('should handle non-existent user gracefully', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await unshareWith('item', 'Category', 'sharer', 'nonexistent-user', ItemTypes.CHECKLIST)

      expect(result.success).toBe(true)
    })

    it('should handle write errors', async () => {
      mockReadJsonFile.mockResolvedValue({
        receiver: [{ uuid: 'item', permissions: { canRead: true } }],
      })
      mockWriteJsonFile.mockRejectedValue(new Error('Write failed'))

      const result = await unshareWith('item', 'Category', 'sharer', 'receiver', ItemTypes.CHECKLIST)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to write unshare file')
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'item_unshared',
        success: false,
      }))
    })

    it('should work with note items', async () => {
      mockReadJsonFile.mockResolvedValue({
        receiver: [
          { uuid: 'note-uuid', id: 'note', sharer: 'sharer', permissions: { canRead: true } },
        ],
      })

      const result = await unshareWith('note-uuid', 'Category', 'sharer', 'receiver', ItemTypes.NOTE)

      expect(result.success).toBe(true)
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

    it('should return only notes when no checklists shared', async () => {
      mockReadJsonFile
        .mockResolvedValueOnce({
          user: [{ uuid: 'note-1', id: 'note', sharer: 'sharer', permissions: { canRead: true } }],
        })
        .mockResolvedValueOnce({})

      const result = await getAllSharedItemsForUser('user')

      expect(result.notes).toHaveLength(1)
      expect(result.checklists).toHaveLength(0)
    })

    it('should return only checklists when no notes shared', async () => {
      mockReadJsonFile
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          user: [{ uuid: 'checklist-1', id: 'checklist', sharer: 'sharer', permissions: { canRead: true } }],
        })

      const result = await getAllSharedItemsForUser('user')

      expect(result.notes).toHaveLength(0)
      expect(result.checklists).toHaveLength(1)
    })

    it('should return multiple shared items', async () => {
      mockReadJsonFile
        .mockResolvedValueOnce({
          user: [
            { uuid: 'note-1', id: 'note-1', sharer: 'sharer', permissions: { canRead: true } },
            { uuid: 'note-2', id: 'note-2', sharer: 'sharer', permissions: { canRead: true } },
          ],
        })
        .mockResolvedValueOnce({
          user: [
            { uuid: 'checklist-1', id: 'checklist-1', sharer: 'sharer', permissions: { canRead: true } },
            { uuid: 'checklist-2', id: 'checklist-2', sharer: 'sharer', permissions: { canRead: true } },
          ],
        })

      const result = await getAllSharedItemsForUser('user')

      expect(result.notes).toHaveLength(2)
      expect(result.checklists).toHaveLength(2)
    })
  })

  describe('getAllSharedItems', () => {
    it('should return empty arrays when nothing shared', async () => {
      mockReadJsonFile.mockResolvedValue({})

      const result = await getAllSharedItems()

      expect(result.notes).toEqual([])
      expect(result.checklists).toEqual([])
      expect(result.public.notes).toEqual([])
      expect(result.public.checklists).toEqual([])
    })

    it('should collect all shared notes', async () => {
      mockReadJsonFile
        .mockResolvedValueOnce({
          user1: [{ uuid: 'note-1', id: 'note-1', category: 'Cat1', sharer: 'sharer', permissions: { canRead: true } }],
          user2: [{ uuid: 'note-2', id: 'note-2', category: 'Cat2', sharer: 'sharer', permissions: { canRead: true } }],
        })
        .mockResolvedValueOnce({})

      const result = await getAllSharedItems()

      expect(result.notes).toHaveLength(2)
      expect(result.notes).toContainEqual({ id: 'note-1', category: 'Cat1' })
      expect(result.notes).toContainEqual({ id: 'note-2', category: 'Cat2' })
    })

    it('should collect all shared checklists', async () => {
      mockReadJsonFile
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          user1: [{ uuid: 'cl-1', id: 'cl-1', category: 'Cat1', sharer: 'sharer', permissions: { canRead: true } }],
          user2: [{ uuid: 'cl-2', id: 'cl-2', category: 'Cat2', sharer: 'sharer', permissions: { canRead: true } }],
        })

      const result = await getAllSharedItems()

      expect(result.checklists).toHaveLength(2)
      expect(result.checklists).toContainEqual({ id: 'cl-1', category: 'Cat1' })
      expect(result.checklists).toContainEqual({ id: 'cl-2', category: 'Cat2' })
    })

    it('should deduplicate shared items', async () => {
      mockReadJsonFile
        .mockResolvedValueOnce({
          user1: [{ uuid: 'note-1', id: 'note', category: 'Cat', sharer: 'sharer1', permissions: { canRead: true } }],
          user2: [{ uuid: 'note-2', id: 'note', category: 'Cat', sharer: 'sharer2', permissions: { canRead: true } }],
        })
        .mockResolvedValueOnce({})

      const result = await getAllSharedItems()

      expect(result.notes).toHaveLength(1)
      expect(result.notes[0]).toEqual({ id: 'note', category: 'Cat' })
    })

    it('should handle public shares', async () => {
      mockReadJsonFile
        .mockResolvedValueOnce({
          public: [{ uuid: 'pub-note', id: 'pub-note', category: 'Public', sharer: 'sharer', permissions: { canRead: true } }],
        })
        .mockResolvedValueOnce({
          public: [{ uuid: 'pub-cl', id: 'pub-cl', category: 'Public', sharer: 'sharer', permissions: { canRead: true } }],
        })

      const result = await getAllSharedItems()

      expect(result.public.notes).toHaveLength(1)
      expect(result.public.checklists).toHaveLength(1)
    })

    it('should skip entries without id and category', async () => {
      mockReadJsonFile
        .mockResolvedValueOnce({
          user: [
            { uuid: 'note-1', id: 'note-1', category: 'Cat', sharer: 'sharer', permissions: { canRead: true } },
            { uuid: 'note-2', sharer: 'sharer', permissions: { canRead: true } },
          ],
        })
        .mockResolvedValueOnce({})

      const result = await getAllSharedItems()

      expect(result.notes).toHaveLength(1)
    })
  })

  describe('updateSharingData', () => {
    it('should remove all shares when newItem is null', async () => {
      mockReadJsonFile.mockResolvedValue({
        user1: [
          { uuid: 'item-1', id: 'item', category: 'Category', sharer: 'sharer', permissions: { canRead: true } },
        ],
        user2: [
          { uuid: 'item-2', id: 'other', category: 'Category', sharer: 'sharer', permissions: { canRead: true } },
        ],
      })

      await updateSharingData(
        { id: 'item', category: 'Category', itemType: ItemTypes.CHECKLIST },
        null
      )

      expect(mockWriteJsonFile).toHaveBeenCalled()
    })

    it('should update item id when changed', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [
          { uuid: 'uuid-1', id: 'old-id', category: 'Category', sharer: 'sharer', permissions: { canRead: true } },
        ],
      })

      await updateSharingData(
        { id: 'old-id', category: 'Category', itemType: ItemTypes.CHECKLIST },
        { id: 'new-id', category: 'Category', itemType: ItemTypes.CHECKLIST }
      )

      expect(mockWriteJsonFile).toHaveBeenCalled()
    })

    it('should update category when changed', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [
          { uuid: 'uuid-1', id: 'item', category: 'OldCat', sharer: 'sharer', permissions: { canRead: true } },
        ],
      })

      await updateSharingData(
        { id: 'item', category: 'OldCat', itemType: ItemTypes.CHECKLIST },
        { id: 'item', category: 'NewCat', itemType: ItemTypes.CHECKLIST }
      )

      expect(mockWriteJsonFile).toHaveBeenCalled()
    })

    it('should update sharer when changed', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [
          { uuid: 'uuid-1', id: 'item', category: 'Category', sharer: 'old-sharer', permissions: { canRead: true } },
        ],
      })

      await updateSharingData(
        { id: 'item', category: 'Category', itemType: ItemTypes.CHECKLIST, sharer: 'old-sharer' },
        { id: 'item', category: 'Category', itemType: ItemTypes.CHECKLIST, sharer: 'new-sharer' }
      )

      expect(mockWriteJsonFile).toHaveBeenCalled()
    })

    it('should not write when no changes detected', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [
          { uuid: 'uuid-1', id: 'other-item', category: 'Category', sharer: 'sharer', permissions: { canRead: true } },
        ],
      })

      await updateSharingData(
        { id: 'item', category: 'Category', itemType: ItemTypes.CHECKLIST },
        { id: 'item', category: 'Category', itemType: ItemTypes.CHECKLIST }
      )

      expect(mockWriteJsonFile).not.toHaveBeenCalled()
    })

    it('should remove user key when all shares removed', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [
          { uuid: 'uuid-1', id: 'item', category: 'Category', sharer: 'sharer', permissions: { canRead: true } },
        ],
      })

      await updateSharingData(
        { id: 'item', category: 'Category', itemType: ItemTypes.CHECKLIST },
        null
      )

      const writeCall = mockWriteJsonFile.mock.calls[0]
      expect(writeCall[0]).not.toHaveProperty('user')
    })

    it('should update sharer for all items when id not provided', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [
          { uuid: 'uuid-1', id: 'item-1', category: 'Cat1', sharer: 'old-sharer', permissions: { canRead: true } },
          { uuid: 'uuid-2', id: 'item-2', category: 'Cat2', sharer: 'old-sharer', permissions: { canRead: true } },
        ],
      })

      await updateSharingData(
        { itemType: ItemTypes.CHECKLIST, sharer: 'old-sharer' },
        { itemType: ItemTypes.CHECKLIST, sharer: 'new-sharer' }
      )

      expect(mockWriteJsonFile).toHaveBeenCalled()
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

    it('should return error when user key does not exist', async () => {
      mockReadJsonFile.mockResolvedValue({
        otheruser: [{ uuid: 'item', permissions: { canRead: true } }],
      })

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

    it('should update permissions successfully by uuid', async () => {
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

    it('should update permissions by id and category', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'other-uuid', id: 'item', category: 'Category', sharer: 'sharer', permissions: { canRead: true, canEdit: false, canDelete: false } }],
      })

      const result = await updateItemPermissions(
        'item',
        'Category',
        ItemTypes.CHECKLIST,
        'user',
        { canRead: true, canEdit: true, canDelete: false }
      )

      expect(result.success).toBe(true)
    })

    it('should grant full permissions', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: true, canEdit: false, canDelete: false } }],
      })

      const result = await updateItemPermissions(
        'item',
        'Category',
        ItemTypes.CHECKLIST,
        'user',
        { canRead: true, canEdit: true, canDelete: true }
      )

      expect(result.success).toBe(true)
    })

    it('should revoke edit permissions', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: true, canEdit: true, canDelete: false } }],
      })

      const result = await updateItemPermissions(
        'item',
        'Category',
        ItemTypes.CHECKLIST,
        'user',
        { canRead: true, canEdit: false, canDelete: false }
      )

      expect(result.success).toBe(true)
    })

    it('should handle write errors', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: true, canEdit: false, canDelete: false } }],
      })
      mockWriteJsonFile.mockRejectedValue(new Error('Write failed'))

      const result = await updateItemPermissions(
        'item',
        'Category',
        ItemTypes.CHECKLIST,
        'user',
        { canRead: true, canEdit: true, canDelete: true }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update permissions')
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'share_permissions_updated',
        success: false,
      }))
    })

    it('should work with note items', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'note-id', permissions: { canRead: true, canEdit: false, canDelete: false } }],
      })

      const result = await updateItemPermissions(
        'note-id',
        'Category',
        ItemTypes.NOTE,
        'user',
        { canRead: true, canEdit: true, canDelete: false }
      )

      expect(result.success).toBe(true)
    })
  })

  describe('updateReceiverUsername', () => {
    it('should update receiver username', async () => {
      mockReadJsonFile.mockResolvedValue({
        olduser: [
          { uuid: 'item-1', id: 'item-1', sharer: 'sharer', permissions: { canRead: true } },
        ],
      })

      await updateReceiverUsername('olduser', 'newuser', ItemTypes.CHECKLIST)

      const writeCall = mockWriteJsonFile.mock.calls[0]
      expect(writeCall[0]).toHaveProperty('newuser')
      expect(writeCall[0]).not.toHaveProperty('olduser')
    })

    it('should preserve all share entries', async () => {
      mockReadJsonFile.mockResolvedValue({
        olduser: [
          { uuid: 'item-1', id: 'item-1', sharer: 'sharer1', permissions: { canRead: true } },
          { uuid: 'item-2', id: 'item-2', sharer: 'sharer2', permissions: { canRead: true } },
        ],
      })

      await updateReceiverUsername('olduser', 'newuser', ItemTypes.CHECKLIST)

      const writeCall = mockWriteJsonFile.mock.calls[0]
      expect(writeCall[0].newuser).toHaveLength(2)
    })

    it('should handle non-existent old username', async () => {
      mockReadJsonFile.mockResolvedValue({
        otheruser: [{ uuid: 'item', permissions: { canRead: true } }],
      })

      await updateReceiverUsername('nonexistent', 'newuser', ItemTypes.CHECKLIST)

      expect(mockWriteJsonFile).not.toHaveBeenCalled()
    })

    it('should work with note items', async () => {
      mockReadJsonFile.mockResolvedValue({
        olduser: [
          { uuid: 'note-1', id: 'note-1', sharer: 'sharer', permissions: { canRead: true } },
        ],
      })

      await updateReceiverUsername('olduser', 'newuser', ItemTypes.NOTE)

      const writeCall = mockWriteJsonFile.mock.calls[0]
      expect(writeCall[0]).toHaveProperty('newuser')
    })

    it('should preserve other users shares', async () => {
      mockReadJsonFile.mockResolvedValue({
        olduser: [{ uuid: 'item-1', permissions: { canRead: true } }],
        otheruser: [{ uuid: 'item-2', permissions: { canRead: true } }],
      })

      await updateReceiverUsername('olduser', 'newuser', ItemTypes.CHECKLIST)

      const writeCall = mockWriteJsonFile.mock.calls[0]
      expect(writeCall[0]).toHaveProperty('newuser')
      expect(writeCall[0]).toHaveProperty('otheruser')
      expect(writeCall[0]).not.toHaveProperty('olduser')
    })
  })

  describe('readShareFile', () => {
    it('should read checklist sharing file', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'item', permissions: { canRead: true } }],
      })

      const result = await readShareFile(ItemTypes.CHECKLIST)

      expect(result).toHaveProperty('user')
    })

    it('should read note sharing file', async () => {
      mockReadJsonFile.mockResolvedValue({
        user: [{ uuid: 'note', permissions: { canRead: true } }],
      })

      const result = await readShareFile(ItemTypes.NOTE)

      expect(result).toHaveProperty('user')
    })

    it('should return empty object when file does not exist', async () => {
      mockReadJsonFile.mockResolvedValue(null)

      const result = await readShareFile(ItemTypes.CHECKLIST)

      expect(result).toEqual({})
    })

    it('should read all sharing files when type is "all"', async () => {
      mockReadJsonFile
        .mockResolvedValueOnce({ user: [{ uuid: 'note', permissions: { canRead: true } }] })
        .mockResolvedValueOnce({ user: [{ uuid: 'checklist', permissions: { canRead: true } }] })

      const result = await readShareFile('all')

      expect(result).toHaveProperty('notes')
      expect(result).toHaveProperty('checklists')
    })

    it('should ensure directory exists', async () => {
      mockReadJsonFile.mockResolvedValue({})

      await readShareFile(ItemTypes.CHECKLIST)

      expect(mockEnsureDir).toHaveBeenCalled()
    })
  })
})
