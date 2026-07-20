"use client";

import { useState, useMemo, useCallback } from "react";
import { DndProvider } from "@/app/_hooks/dnd";
import { Checklist, Item, KanbanStatus } from "@/app/_types";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { ChecklistHeading } from "../Checklists/Parts/Common/ChecklistHeading";
import { BulkPasteModal } from "@/app/_components/GlobalComponents/Modals/BulkPasteModal/BulkPasteModal";
import { StatusManager } from "./StatusManager";
import { ArchivedItems } from "./ArchivedItems";
import { useKanbanBoard } from "@/app/_hooks/kanban/useKanban";
import { useKanbanDnd } from "@/app/_hooks/kanban/useKanbanDnd";
import { ItemTypes, TaskStatus, TaskStatusLabels } from "@/app/_types/enums";
import { ReferencedBySection } from "../Notes/Parts/ReferencedBySection";
import { getReferences } from "@/app/_utils/indexes-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import {
  Settings01Icon,
  Archive02Icon,
  Calendar03Icon,
  TaskDaily01Icon,
  Search01Icon,
} from "hugeicons-react";
import { CalendarView } from "./CalendarView";
import { KanbanCardDetail } from "./KanbanCardDetail";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { updateChecklistStatuses } from "@/app/_server/actions/checklist";
import { archiveItem, unarchiveItem } from "@/app/_server/actions/checklist-item";
import { useTranslations } from "next-intl";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";
import { useToast } from "@/app/_providers/ToastProvider";

interface KanbanBoardProps {
  checklist: Checklist;
  onUpdate: (updatedChecklist: Checklist) => void;
}

const _findItemById = (items: Item[], itemId: string): Item | null => {
  for (const item of items) {
    if (item.id === itemId) return item;
    if (item.children) {
      const found = _findItemById(item.children, itemId);
      if (found) return found;
    }
  }
  return null;
};

export const Kanban = ({ checklist, onUpdate }: KanbanBoardProps) => {
  const t = useTranslations();
  const { showToast } = useToast();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "calendar">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [calendarSelectedItem, setCalendarSelectedItem] = useState<
    import("@/app/_types").Item | null
  >(null);
  const { linkIndex, notes, checklists, appSettings, allSharedItems } =
    useAppMode();
  const isShared =
    allSharedItems?.checklists.some(
      (sharedChecklist) => sharedChecklist.uuid === checklist.uuid,
    ) || false;
  const { permissions } = usePermissions();
  const {
    localChecklist,
    setLocalChecklist,
    isLoading,
    showBulkPasteModal,
    setShowBulkPasteModal,
    focusKey,
    refreshChecklist,
    handleItemUpdate,
    getItemsByStatus,
    handleAddItem,
    handleBulkPaste,
    handleItemStatusUpdate,
  } = useKanbanBoard({ checklist, onUpdate });

  const statuses = useMemo(() => {
    const currentStatuses = localChecklist.statuses || DEFAULT_KANBAN_STATUSES;
    return currentStatuses.map((status) => {
      if (
        status.id === TaskStatus.COMPLETED &&
        status.autoComplete === undefined
      ) {
        return { ...status, autoComplete: true };
      }
      return status;
    });
  }, [localChecklist.statuses]);

  const columns = statuses
    .sort((a, b) => a.order - b.order)
    .map((status) => ({
      id: status.id,
      title: status.label,
      status: status.id,
    }));

  const handleSaveStatuses = async (newStatuses: KanbanStatus[]) => {
    const formData = new FormData();
    formData.append("uuid", localChecklist.uuid || "");
    formData.append("statusesStr", JSON.stringify(newStatuses));

    const result = await updateChecklistStatuses(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      await refreshChecklist();
    }
  };

  const itemsByStatus = statuses.reduce(
    (acc, status) => {
      acc[status.id] = localChecklist.items.filter(
        (item) => item.status === status.id && !item.isArchived,
      ).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const archivedItems = localChecklist.items.filter((item) => item.isArchived);
  const detailItem = useMemo(
    () => (detailItemId ? _findItemById(localChecklist.items, detailItemId) : null),
    [detailItemId, localChecklist.items],
  );

  const handleUnarchive = async (itemId: string) => {
    const formData = new FormData();
    formData.append("uuid", localChecklist.uuid || "");
    formData.append("itemId", itemId);

    const result = await unarchiveItem(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      await refreshChecklist();
    }
  };

  const handleArchiveAll = useCallback(
    async (items: Item[]) => {
      let archivedCount = 0;
      let latestChecklist: Checklist | null = null;

      for (const item of items) {
        const formData = new FormData();
        formData.append("uuid", localChecklist.uuid || "");
        formData.append("itemId", item.id);

        const result = await archiveItem(formData);
        if (!result.success || !result.data) {
          if (latestChecklist) {
            onUpdate(latestChecklist);
          }

          await refreshChecklist();
          showToast({
            type: "error",
            title: t("common.error"),
            message:
              archivedCount > 0
                ? t("kanban.archiveAllPartial", {
                  archived: archivedCount,
                  total: items.length,
                })
                : t("kanban.archiveAllFailed"),
          });
          return;
        }

        archivedCount++;
        latestChecklist = result.data;
      }

      if (latestChecklist) {
        onUpdate(latestChecklist);
        await refreshChecklist();
        showToast({
          type: "success",
          title: t("common.success"),
          message: t("kanban.archiveAllSuccess", { count: items.length }),
        });
      }
    },
    [
      localChecklist.uuid,
      onUpdate,
      refreshChecklist,
      showToast,
      t,
    ],
  );

  const handleToggleItem = useCallback(
    async (itemId: string, completed: boolean) => {
      const newStatus = completed ? TaskStatus.COMPLETED : TaskStatus.TODO;
      await handleItemStatusUpdate(itemId, newStatus);
    },
    [handleItemStatusUpdate],
  );

  const _hasFilters = searchQuery || priorityFilter || assigneeFilter;

  const _filterItems = useCallback(
    (items: import("@/app/_types").Item[]) => {
      if (!_hasFilters) return items;
      return items.filter((item) => {
        if (
          searchQuery &&
          !item.text.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return false;
        if (priorityFilter && item.priority !== priorityFilter) return false;
        if (assigneeFilter && item.assignee !== assigneeFilter) return false;
        return true;
      });
    },
    [searchQuery, priorityFilter, assigneeFilter, _hasFilters],
  );

  const visibleFor = useCallback(
    (status: string) => _filterItems(getItemsByStatus(status)),
    [_filterItems, getItemsByStatus],
  );

  const { handleDrop } = useKanbanDnd({
    checklist: localChecklist,
    setChecklist: setLocalChecklist,
    onUpdate,
    visibleFor,
    fallbackMove: handleItemStatusUpdate,
  });

  const _uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    localChecklist.items.forEach((item) => {
      if (item.assignee) assignees.add(item.assignee);
    });
    return Array.from(assignees);
  }, [localChecklist.items]);

  const _renderColumns = useCallback(
    () => (
      <div
        className={
          columns.length <= 6
            ? "h-full min-w-0 kanban-grid gap-4 p-2 sm:p-4"
            : "min-h-0 min-w-0 flex gap-4 p-2 sm:p-4"
        }
        style={
          columns.length <= 6
            ? ({
              "--kanban-col-count": columns.length,
            } as React.CSSProperties)
            : undefined
        }
      >
        {columns.map((column) => {
          const columnItems = getItemsByStatus(column.status);
          const items = _filterItems(columnItems);
          return (
            <div
              key={column.id}
              className={columns.length > 6 ? "flex-shrink-0" : "min-w-0"}
              style={columns.length > 6 ? { width: "280px" } : undefined}
            >
              <KanbanColumn
                checklist={localChecklist}
                id={column.id}
                title={column.title}
                items={items}
                status={column.status}
                onUpdate={handleItemUpdate}
                onOpenDetail={(item) => setDetailItemId(item.id)}
                isShared={isShared}
                statusColor={statuses.find((s) => s.id === column.id)?.color}
                statuses={statuses}
                onAddItem={permissions?.canEdit ? (text) => handleAddItem(text, undefined, column.status) : undefined}
                archivableCount={columnItems.length}
                onArchiveAll={
                  permissions?.canEdit
                    ? () => handleArchiveAll(columnItems)
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
    ),
    [
      columns,
      getItemsByStatus,
      _filterItems,
      localChecklist,
      handleItemUpdate,
      isShared,
      statuses,
      handleArchiveAll,
      permissions?.canEdit,
    ],
  );

  const referencingItems = useMemo(() => {
    return getReferences(
      linkIndex,
      localChecklist.uuid,
      ItemTypes.CHECKLIST,
      notes,
      checklists,
    );
  }, [linkIndex, localChecklist.uuid, checklists, notes]);

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto overflow-x-hidden min-w-0 max-w-full jotty-scrollable-content">
      {permissions?.canEdit && (
        <ChecklistHeading
          key={focusKey}
          checklist={checklist}
          onSubmit={handleAddItem}
          onToggleCompletedItem={handleToggleItem}
          onBulkSubmit={() => setShowBulkPasteModal(true)}
          isLoading={isLoading}
          autoFocus={true}
          focusKey={focusKey}
          placeholder={t("checklists.addNewTask")}
          submitButtonText={t("kanban.addItem")}
        />
      )}
      <div className="flex flex-wrap gap-2 items-center w-full min-w-0 px-2 sm:px-4 pt-4 pb-2">
        <div className="flex gap-1 border border-border rounded-jotty p-0.5 shrink-0">
          <Button
            variant={viewMode === "board" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("board")}
            className="text-xs sm:text-md lg:text-xs h-7"
          >
            <TaskDaily01Icon className="h-3 w-3 mr-1 shrink-0" />
            <span className="truncate">{t("kanban.title")}</span>
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="text-xs sm:text-md lg:text-xs h-7"
          >
            <Calendar03Icon className="h-3 w-3 mr-1 shrink-0" />
            <span className="truncate">{t("kanban.calendar")}</span>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 justify-end min-w-0 flex-1">
          {permissions?.canEdit && viewMode === "board" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatusModal(true)}
              className="text-xs sm:text-md lg:text-xs shrink-0"
              aria-label={t("kanban.manageStatuses")}
            >
              <Settings01Icon className="h-3 w-3 mr-1 shrink-0" />
              <span className="hidden sm:inline">
                {t("kanban.manageStatuses")}
              </span>
            </Button>
          )}
          {viewMode === "board" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchivedModal(true)}
              className="text-xs sm:text-md lg:text-xs shrink-0"
              aria-label={t("kanban.viewArchived")}
            >
              <Archive02Icon className="h-3 w-3 mr-1 shrink-0" />
              <span className="hidden sm:inline">
                {t("kanban.viewArchived")}
              </span>
            </Button>
          )}
        </div>
      </div>
      {viewMode === "board" && (
        <div className="flex flex-wrap gap-2 items-center px-2 sm:px-4 pb-2">
          <div className="relative flex-1 min-w-[150px] max-w-xs">
            <Search01Icon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("kanban.searchPlaceholder")}
              className="w-full pl-7 pr-2 py-1.5 text-xs bg-background border border-input rounded-jotty focus:outline-none focus:border-ring"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2 py-1.5 text-xs bg-background border border-input rounded-jotty focus:outline-none focus:border-ring"
          >
            <option value="">{t("kanban.allPriorities")}</option>
            <option value="critical">{t("kanban.critical")}</option>
            <option value="high">{t("kanban.high")}</option>
            <option value="medium">{t("kanban.medium")}</option>
            <option value="low">{t("kanban.low")}</option>
          </select>
          {isShared && _uniqueAssignees.length > 0 && (
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-2 py-1.5 text-xs bg-background border border-input rounded-jotty focus:outline-none focus:border-ring"
            >
              <option value="">{t("kanban.allAssignees")}</option>
              {_uniqueAssignees.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0 w-full max-w-full overflow-auto pb-[8.5em]">
        {viewMode === "calendar" ? (
          <div className="p-4">
            <CalendarView
              checklist={localChecklist}
              onItemClick={(item) => setCalendarSelectedItem(item)}
            />
          </div>
        ) : (
          <DndProvider
            onDrop={handleDrop}
            renderGhost={(itemId) => {
              const ghostItem = _findItemById(localChecklist.items, itemId);
              if (!ghostItem) return null;
              return (
                <KanbanCard
                  checklist={localChecklist}
                  item={ghostItem}
                  isDragging
                  onUpdate={() => { }}
                  onOpenDetail={() => { }}
                  isShared={isShared}
                  statuses={statuses}
                />
              );
            }}
          >
            {_renderColumns()}
          </DndProvider>
        )}

        <div className="px-4 pt-4 pb-[100px] lg:pb-4">
          {referencingItems.length > 0 &&
            appSettings?.editor?.enableBilateralLinks && (
              <ReferencedBySection referencingItems={referencingItems} />
            )}
        </div>
      </div>

      {calendarSelectedItem && (
        <KanbanCardDetail
          checklist={localChecklist}
          item={calendarSelectedItem}
          isOpen={!!calendarSelectedItem}
          onClose={() => setCalendarSelectedItem(null)}
          onUpdate={handleItemUpdate}
        />
      )}

      {detailItem && (
        <KanbanCardDetail
          checklist={localChecklist}
          item={detailItem}
          isOpen={!!detailItem}
          onClose={() => setDetailItemId(null)}
          onUpdate={handleItemUpdate}
        />
      )}

      {showBulkPasteModal && (
        <BulkPasteModal
          isOpen={showBulkPasteModal}
          onClose={() => setShowBulkPasteModal(false)}
          onSubmit={handleBulkPaste}
          isLoading={isLoading}
        />
      )}

      {showStatusModal && (
        <StatusManager
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          currentStatuses={statuses}
          onSave={handleSaveStatuses}
          itemsByStatus={itemsByStatus}
        />
      )}

      {showArchivedModal && (
        <ArchivedItems
          isOpen={showArchivedModal}
          onClose={() => setShowArchivedModal(false)}
          archivedItems={archivedItems}
          onUnarchive={handleUnarchive}
          statuses={statuses}
        />
      )}
    </div>
  );
};
