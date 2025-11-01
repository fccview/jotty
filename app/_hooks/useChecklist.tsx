"use client";

import { useState, useEffect, useRef } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Checklist, RecurrenceRule } from "@/app/_types";
import {
  deleteList,
  convertChecklistType,
  getListById,
} from "@/app/_server/actions/checklist";
import {
  createItem,
  updateItem,
  reorderItems,
  createBulkItems,
  bulkToggleItems,
  bulkDeleteItems,
  createSubItem,
} from "@/app/_server/actions/checklist-item";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getUserByChecklist,
} from "@/app/_server/actions/users";
import { copyTextToClipboard } from "../_utils/global-utils";

interface UseChecklistProps {
  list: Checklist;
  onUpdate: (updatedChecklist: Checklist) => void;
  onDelete?: (deletedId: string) => void;
}

export const useChecklist = ({
  list,
  onUpdate,
  onDelete,
}: UseChecklistProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [localList, setLocalList] = useState(list);
  const [focusKey, setFocusKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    setLocalList(list);
  }, [list]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onUpdate(localList);
  }, [localList, onUpdate]);

  useEffect(() => {
    if (itemsToDelete.length === 0) {
      return;
    }

    const timer = setTimeout(async () => {
      const idsToProcess = [...itemsToDelete];

      const formData = new FormData();
      formData.append("listId", localList.id);
      formData.append("itemIds", JSON.stringify(idsToProcess));
      formData.append("category", localList.category || "Uncategorized");

      try {
        const result = await bulkDeleteItems(formData);
        if (!result.success) {
          throw new Error("Server action failed");
        }
      } catch (error) {
        console.error("Failed to bulk delete items:", error);
        router.refresh();
      } finally {
        setItemsToDelete([]);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [itemsToDelete, localList.id, localList.category, router]);

  const handleDeleteItem = (itemId: string) => {
    setLocalList((currentList) => {
      const filterNestedItem = (items: any[]): any[] => {
        return items
          .filter((item) => item.id !== itemId)
          .map((item) => ({
            ...item,
            children: item.children
              ? filterNestedItem(item.children)
              : undefined,
          }))
          .filter((item) => item.children?.length > 0 || item.id !== undefined);
      };

      return {
        ...currentList,
        items: filterNestedItem(currentList.items),
      };
    });

    setFocusKey((prev) => prev + 1);

    setItemsToDelete((prevItems) => {
      if (prevItems.includes(itemId)) {
        return prevItems;
      }
      return [...prevItems, itemId];
    });
  };

  const handleDeleteList = async () => {
    if (confirm("Are you sure you want to delete this checklist?")) {
      const formData = new FormData();
      formData.append("id", localList.id);
      formData.append("category", localList.category || "Uncategorized");
      await deleteList(formData);
      onDelete?.(localList.id);
    }
  };

  const findItemById = (items: any[], itemId: string): any | null => {
    for (const item of items) {
      if (item.id === itemId) {
        return item;
      }

      if (item.children && item.children.length > 0) {
        const found = findItemById(item.children, itemId);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  const findParentAndSiblings = (
    items: any[],
    itemId: string,
    parent: any = null,
    siblings: any[] = []
  ): { parent: any | null; siblings: any[] } | null => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.id === itemId) {
        return { parent, siblings: items };
      }

      if (item.children && item.children.length > 0) {
        const result = findParentAndSiblings(
          item.children,
          itemId,
          item,
          item.children
        );
        if (result) {
          return result;
        }
      }
    }
    return null;
  };

  const areAllItemsCompleted = (items: any[]): boolean => {
    if (items.length === 0) return true;

    return items.every((item) => {
      if (item.children && item.children.length > 0) {
        return item.completed && areAllItemsCompleted(item.children);
      }
      return item.completed;
    });
  };

  const areAnyItemsCompleted = (items: any[]): boolean => {
    return items.some((item) => {
      if (item.children && item.children.length > 0) {
        return item.completed || areAnyItemsCompleted(item.children);
      }
      return item.completed;
    });
  };

  const updateAllChildren = (items: any[], completed: boolean): any[] => {
    return items.map((item) => ({
      ...item,
      completed,
      children: item.children
        ? updateAllChildren(item.children, completed)
        : undefined,
    }));
  };

  const updateParentBasedOnChildren = (parent: any): any => {
    if (!parent || !parent.children || parent.children.length === 0) {
      return parent;
    }

    const allChildrenCompleted = areAllItemsCompleted(parent.children);
    const anyChildrenCompleted = areAnyItemsCompleted(parent.children);

    let updatedParent = { ...parent };

    if (allChildrenCompleted) {
      updatedParent.completed = true;
    } else if (!anyChildrenCompleted) {
      updatedParent.completed = false;
    }

    return updatedParent;
  };

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("itemId", itemId);
    formData.append("completed", String(completed));
    formData.append("category", localList.category || "Uncategorized");
    const result = await updateItem(localList, formData);

    if (result.success && result.data) {
      setLocalList(result.data);
    } else if (result.success) {
      setLocalList((currentList) => {
        const updateNestedWithSync = (items: any[]): any[] => {
          return items.map((item) => {
            let updatedItem = { ...item };

            if (item.id === itemId) {
              updatedItem.completed = completed;

              if (completed && item.children && item.children.length > 0) {
                updatedItem.children = updateAllChildren(item.children, true);
              } else if (
                !completed &&
                item.children &&
                item.children.length > 0
              ) {
                updatedItem.children = updateAllChildren(item.children, false);
              }
            }

            if (item.children && item.children.length > 0) {
              updatedItem.children = updateNestedWithSync(item.children);

              updatedItem = updateParentBasedOnChildren(updatedItem);
            }

            return updatedItem;
          });
        };

        const updatedItems = updateNestedWithSync(currentList.items);

        const updateParentsForSiblings = (items: any[]): any[] => {
          return items.map((item) => {
            if (item.children && item.children.length > 0) {
              const updatedChildren = updateParentsForSiblings(item.children);
              const updatedItem = updateParentBasedOnChildren({
                ...item,
                children: updatedChildren,
              });
              return updatedItem;
            }
            return item;
          });
        };

        return {
          ...currentList,
          items: updateParentsForSiblings(updatedItems),
        };
      });
    } else {
      console.error("Failed to update item:", result.error);
    }
  };

  const handleEditItem = async (itemId: string, text: string) => {
    const formData = new FormData();
    const owner = await getUserByChecklist(localList.id, localList.category || "Uncategorized");
    formData.append("listId", localList.id);
    formData.append("itemId", itemId);
    formData.append("text", text);
    formData.append("category", localList.category || "Uncategorized");
    formData.append("user", owner.data?.username || "");

    const result = await updateItem(localList, formData);

    if (result.success) {
      if (result.data) {
        setLocalList(result.data as Checklist);
      } else {
        setLocalList((currentList) => {
          const updateNestedItem = (items: any[]): any[] => {
            return items.map((item) => {
              if (item.id === itemId) {
                return { ...item, text };
              }

              if (item.children && item.children.length > 0) {
                return {
                  ...item,
                  children: updateNestedItem(item.children),
                };
              }

              return item;
            });
          };

          return {
            ...currentList,
            items: updateNestedItem(currentList.items),
          };
        });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const allItems = localList.items;
      const oldIndex = allItems.findIndex((item) => item.id === active.id);
      const newIndex = allItems.findIndex((item) => item.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(allItems, oldIndex, newIndex).map(
          (item, index) => ({ ...item, order: index })
        );

        setLocalList({ ...localList, items: newItems });

        const itemIds = newItems.map((item) => item.id);
        const formData = new FormData();
        formData.append("listId", localList.id);
        formData.append("itemIds", JSON.stringify(itemIds));
        formData.append("currentItems", JSON.stringify(newItems));
        formData.append("category", localList.category || "Uncategorized");
        const result = await reorderItems(formData);

        if (!result.success) {
          setLocalList(list);
        }
      }
    }
  };

  const handleBulkPaste = async (itemsText: string) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("itemsText", itemsText);
    formData.append("category", localList.category || "Uncategorized");
    const result = await createBulkItems(formData);
    setIsLoading(false);

    if (result.success && result.data) {
      setLocalList(result.data as Checklist);
    }
  };

  const handleConvertType = () => {
    setShowConversionModal(true);
  };

  const getNewType = (currentType: "simple" | "task"): "simple" | "task" => {
    return currentType === "simple" ? "task" : "simple";
  };

  const handleConfirmConversion = async () => {
    setIsLoading(true);
    const newType = getNewType(localList.type);
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("newType", newType);
    formData.append("category", localList.category || "Uncategorized");
    const result = await convertChecklistType(formData);
    setIsLoading(false);

    if (result.success && result.data) {
      setLocalList(result.data as Checklist);
    }
  };

  const handleBulkToggle = async (completed: boolean) => {
    const findTargetItems = (items: any[]): any[] => {
      const targets: any[] = [];

      items.forEach((item) => {
        const shouldToggle = completed ? !item.completed : item.completed;
        if (shouldToggle) {
          targets.push(item);
        }

        if (item.children && item.children.length > 0) {
          targets.push(...findTargetItems(item.children));
        }
      });

      return targets;
    };

    const targetItems = findTargetItems(localList.items);
    if (targetItems.length === 0) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("completed", String(completed));
    formData.append(
      "itemIds",
      JSON.stringify(targetItems.map((item) => item.id))
    );
    formData.append("category", localList.category || "Uncategorized");

    const result = await bulkToggleItems(formData);
    setIsLoading(false);

    if (result.success && result.data) {
      setLocalList(result.data as Checklist);
      setFocusKey((prev) => prev + 1);
    }
  };

  const handleCreateItem = async (
    text: string,
    recurrence?: RecurrenceRule
  ) => {
    setIsLoading(true);
    const formData = new FormData();

    formData.append("listId", localList.id);
    formData.append("text", text);
    formData.append("category", localList.category || "Uncategorized");

    const currentUser = await getCurrentUser();
    if (recurrence) {
      formData.append("recurrence", JSON.stringify(recurrence));
    }
    const result = await createItem(localList, formData, currentUser?.username);

    const checklistOwner = await getUserByChecklist(
      localList.id,
      localList.category || "Uncategorized"
    );

    const updatedList = await getListById(
      localList.id,
      checklistOwner?.data?.username,
      localList.category
    );

    if (updatedList) {
      setLocalList(updatedList);
    }
    setIsLoading(false);

    if (result.success && result.data) {
      router.refresh();
      setFocusKey((prev) => prev + 1);
    } else {
      console.error("Failed to create item:", result.error);
    }
  };

  const handleAddSubItem = async (parentId: string, text: string) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("parentId", parentId);
    formData.append("text", text);
    formData.append("category", localList.category || "Uncategorized");
    const result = await createSubItem(formData);
    setIsLoading(false);

    if (result.success) {
      if (result.data && typeof result.data === "object" && result.data.items) {
        setLocalList(result.data as Checklist);
      } else {
        const updateItemWithSubItem = (
          items: any[],
          parentId: string,
          newSubItem: any
        ): any[] => {
          return items.map((item) => {
            if (item.id === parentId) {
              return {
                ...item,
                children: [...(item.children || []), newSubItem],
              };
            }

            if (item.children) {
              return {
                ...item,
                children: updateItemWithSubItem(
                  item.children,
                  parentId,
                  newSubItem
                ),
              };
            }

            return item;
          });
        };

        setLocalList((currentList) => ({
          ...currentList,
          items: updateItemWithSubItem(currentList.items, parentId, {
            id: `${localList.id}-sub-${Date.now()}`,
            text,
            completed: false,
            order: 0,
          }),
        }));
      }
      router.refresh();
    }
  };

  const handleCopyId = async () => {
    const success = await copyTextToClipboard(localList.id);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isItemFullyCompleted = (item: any): boolean => {
    if (!item.completed) return false;

    if (item.children && item.children.length > 0) {
      return item.children.every(isItemFullyCompleted);
    }

    return true;
  };

  const hasAnyCompletion = (item: any): boolean => {
    if (item.completed) return true;

    if (item.children && item.children.length > 0) {
      return item.children.some(hasAnyCompletion);
    }

    return false;
  };

  const incompleteItems = localList.items.filter(
    (item) => !isItemFullyCompleted(item)
  );
  const completedItems = localList.items.filter((item) =>
    isItemFullyCompleted(item)
  );

  return {
    isLoading,
    showShareModal,
    setShowShareModal,
    showBulkPasteModal,
    setShowBulkPasteModal,
    showConversionModal,
    setShowConversionModal,
    localList,
    focusKey,
    setFocusKey,
    copied,
    handleDeleteList,
    handleToggleItem,
    handleEditItem,
    handleDeleteItem,
    handleDragEnd,
    handleBulkPaste,
    handleConvertType,
    getNewType,
    handleConfirmConversion,
    handleBulkToggle,
    handleCreateItem,
    handleAddSubItem,
    handleCopyId,
    incompleteItems,
    completedItems,
    totalCount: localList.items.length,
    deletingItemsCount: itemsToDelete.length,
  };
};
