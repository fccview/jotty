"use client";

import { plainItemText } from "@/app/_utils/item-href-utils";
import { useState, useEffect, useMemo } from "react";
import { Modal, ModalVariant, ModalWidth } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Item, Checklist, KanbanPriority, Result } from "@/app/_types";
import {
  createSubItem,
  updateItem,
  deleteItem,
  bulkToggleItems,
  updateItemStatus,
} from "@/app/_server/actions/checklist-item";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { usePreferredDateTime } from "@/app/_hooks/usePreferredDateTime";
import { useTranslations } from "next-intl";
import { KanbanCardPane, KanbanPriorityLevel } from "@/app/_types/enums";
import { KanbanCardDetailProperties } from "./KanbanCardDetailProperties";
import { KanbanAssigneePicker } from "./KanbanAssigneePicker";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";
import { KanbanCardDetailSubtasks } from "./KanbanCardDetailSubtasks";
import { KanbanCardDetailComments } from "./KanbanCardDetailComments";
import { KanbanCardDescription } from "./KanbanCardDescription";
import { KanbanCardHistory } from "./KanbanCardHistory";
import { PanelTabs } from "@/app/_components/GlobalComponents/Tabs/PanelTabs";
import { Comment02Icon, SlidersHorizontalIcon, TaskDaily01Icon } from "@hugeicons/core-free-icons";
import { KanbanItemTimer } from "./KanbanItemTimer";
import { TimeEntriesAccordion } from "./TimeEntriesAccordion";
import { TimeEntriesModal } from "./TimeEntriesModal";
import { useKanbanItem } from "@/app/_hooks/kanban/useKanbanItem";
import { useBoardPeople } from "@/app/_hooks/kanban/useBoardPeople";
import { useAssignee } from "@/app/_hooks/kanban/useAssignee";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { formatTimerTime } from "@/app/_utils/kanban/index";
import { toDateKey } from "@/app/_utils/kanban/calendar-utils";
import { findItem } from "@/app/_utils/item-tree-utils";
import { cn } from "@/app/_utils/global-utils";
import { CopyIdButton } from "@/app/_components/GlobalComponents/Buttons/CopyIdButton";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";

interface KanbanCardDetailProps {
  checklist: Checklist;
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedChecklist: Checklist) => void;
}

const _sanitizeDescription = (text: string): string => text.replace(/\n/g, "\\n");
const _unsanitizeDescription = (text: string): string => text.replace(/\\n/g, "\n");

const _allChildrenComplete = (children: Item[]): boolean =>
  children.every((child) =>
    child.completed && (!child.children?.length || _allChildrenComplete(child.children))
  );

const DESKTOP_ONLY = "hidden lg:block";

const _commentsClass = (pane: KanbanCardPane, isEditing: boolean) => {
  if (pane === KanbanCardPane.COMMENTS) return isEditing ? "lg:hidden" : "";
  return isEditing ? "hidden" : DESKTOP_ONLY;
};

export const KanbanCardDetail = ({
  checklist,
  item: initialItem,
  isOpen,
  onClose,
  onUpdate,
}: KanbanCardDetailProps) => {
  const checklistUuid = checklist.uuid || "";
  const t = useTranslations();
  const { permissions } = usePermissions();
  const canEdit = !!permissions?.canEdit;
  const { user, usersPublicData } = useAppMode();
  const { formatDateTimeString, formatDateString, formatTimeString } =
    usePreferredDateTime();
  const statuses = checklist.statuses || DEFAULT_KANBAN_STATUSES;
  const defaultStatusId =
    [...statuses].sort((a, b) => a.order - b.order)[0]?.id || "";

  const [pane, setPane] = useState(KanbanCardPane.TASK);
  const [commentCount, setCommentCount] = useState(0);
  const [item, setItem] = useState(initialItem);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(initialItem.text);
  const [editDescription, setEditDescription] = useState(_unsanitizeDescription(initialItem.description || ""));
  const [scoreInput, setScoreInput] = useState(initialItem.score?.toString() || "");
  const [reminderInput, setReminderInput] = useState(initialItem.reminder?.datetime || "");
  const [targetDateInput, setTargetDateInput] = useState(initialItem.targetDate || "");
  const [startDateInput, setStartDateInput] = useState(initialItem.startDate || "");
  const [priorityInput, setPriorityInput] = useState<KanbanPriority>(initialItem.priority || KanbanPriorityLevel.NONE);
  const [statusInput, setStatusInput] = useState(initialItem.status || defaultStatusId);
  const [estimatedTimeInput, setEstimatedTimeInput] = useState(initialItem.estimatedTime?.toString() || "");
  const [showTimeEntriesModal, setShowTimeEntriesModal] = useState(false);

  const kanbanItemHook = useKanbanItem({
    checklist,
    item,
    onUpdate,
  });

  useEffect(() => {
    setItem(initialItem);
    setEditText(initialItem.text);
    setEditDescription(_unsanitizeDescription(initialItem.description || ""));
    setScoreInput(initialItem.score?.toString() || "");
    setReminderInput(initialItem.reminder?.datetime || "");
    setTargetDateInput(initialItem.targetDate || "");
    setStartDateInput(initialItem.startDate || "");
    setPriorityInput(initialItem.priority || KanbanPriorityLevel.NONE);
    setStatusInput(initialItem.status || defaultStatusId);
    setEstimatedTimeInput(initialItem.estimatedTime?.toString() || "");
  }, [initialItem, defaultStatusId]);

  const { people, mentionable, reload: reloadPeople } = useBoardPeople({
    uuid: checklistUuid,
    owner: checklist.owner,
    isOpen,
    canEdit,
  });

  const descriptionMarkdown = useMemo(() => {
    if (!item.description) return "";
    return _unsanitizeDescription(item.description);
  }, [item.description]);

  const _autoCompleteStatus = useMemo(
    () => (checklist.statuses || []).find((s) => s.autoComplete),
    [checklist.statuses],
  );

  const _formFor = (fields: Record<string, string>) => {
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
    return formData;
  };

  const _adopt = (result: Result<Checklist>): Item | null => {
    if (!result.success || !result.data) return null;
    onUpdate(result.data);
    const updatedItem = findItem(result.data.items, item.id);
    if (updatedItem) setItem(updatedItem);
    return updatedItem;
  };

  const _saveField = async (fields: Record<string, string>) => {
    const result = await updateItem(checklist, _formFor({ itemId: item.id, ...fields }));
    _adopt(result);
    return result;
  };

  const assignee = useAssignee({
    uuid: checklistUuid,
    people,
    save: _saveField,
    onShared: reloadPeople,
  });

  const _resetEdit = () => {
    setEditText(item.text);
    setEditDescription(_unsanitizeDescription(item.description || ""));
    setIsEditing(false);
  };

  const handleSave = async () => {
    const currentUnsanitized = _unsanitizeDescription(item.description || "");
    if (editText.trim() !== item.text || editDescription.trim() !== currentUnsanitized) {
      const updatedItem = _adopt(
        await updateItem(
          checklist,
          _formFor({
            itemId: item.id,
            text: editText.trim(),
            description: _sanitizeDescription(editDescription.trim()),
          }),
        ),
      );
      if (updatedItem) {
        setEditText(updatedItem.text);
        setEditDescription(_unsanitizeDescription(updatedItem.description || ""));
      }
    }
    setIsEditing(false);
  };

  const handleAddNestedSubtask = async (parentId: string, text: string) => {
    _adopt(await createSubItem(_formFor({ parentId, text })));
  };

  const handleAddSubtask = (text: string) => handleAddNestedSubtask(item.id, text);

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    const updatedItem = _adopt(
      await updateItem(checklist, _formFor({ itemId: subtaskId, completed: completed.toString() })),
    );
    if (!updatedItem || !_autoCompleteStatus) return;
    if (!updatedItem.children?.length || !_allChildrenComplete(updatedItem.children)) return;
    const statusItem = _adopt(
      await updateItemStatus(_formFor({ itemId: item.id, status: _autoCompleteStatus.id })),
    );
    if (statusItem) setStatusInput(statusItem.status || _autoCompleteStatus.id);
  };

  const handleEditSubtask = async (subtaskId: string, text: string) => {
    _adopt(await updateItem(checklist, _formFor({ itemId: subtaskId, text })));
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    _adopt(await deleteItem(_formFor({ itemId: subtaskId })));
  };

  const handleToggleAll = async (completed: boolean) => {
    if (!item.children?.length) return;
    const _findTargetItems = (items: Item[]): Item[] => {
      const targets: Item[] = [];
      items.forEach((subtask) => {
        const shouldToggle = completed ? !subtask.completed : subtask.completed;
        if (shouldToggle) targets.push(subtask);
        if (subtask.children?.length) targets.push(..._findTargetItems(subtask.children));
      });
      return targets;
    };
    const targetItems = _findTargetItems(item.children);
    if (!targetItems.length) return;
    _adopt(
      await bulkToggleItems(
        _formFor({
          completed: String(completed),
          itemIds: JSON.stringify(targetItems.map((target) => target.id)),
        }),
      ),
    );
  };

  const handlePriorityChange = async (priority: KanbanPriority) => {
    setPriorityInput(priority);
    await _saveField({ priority });
  };

  const handleStatusChange = async (status: string) => {
    setStatusInput(status);
    const updatedItem = _adopt(await updateItemStatus(_formFor({ itemId: item.id, status })));
    if (updatedItem) setStatusInput(updatedItem.status || status);
  };

  const handleScoreSave = async () => {
    const score = parseInt(scoreInput);
    if (isNaN(score)) return;
    await _saveField({ score: score.toString() });
  };

  const handleReminderChange = async (value: string) => {
    setReminderInput(value);
    await _saveField({
      reminder: value ? JSON.stringify({ datetime: new Date(value).toISOString() }) : "",
    });
  };

  const handleStartDateChange = async (value: string) => {
    const key = toDateKey(value);
    setStartDateInput(key);
    const targetKey = toDateKey(targetDateInput);
    if (key && targetKey && key > targetKey) {
      setTargetDateInput(key);
      await _saveField({ startDate: key, targetDate: key });
      return;
    }
    await _saveField({ startDate: key });
  };

  const handleTargetDateChange = async (value: string) => {
    const key = toDateKey(value);
    setTargetDateInput(key);
    if (!key) {
      await _saveField({ targetDate: "" });
      return;
    }
    const startKey = toDateKey(startDateInput);
    if (startKey && startKey > key) {
      setStartDateInput(key);
      await _saveField({ targetDate: key, startDate: key });
      return;
    }
    await _saveField({ targetDate: key });
  };

  const handleEstimatedTimeSave = async () => {
    const hours = parseFloat(estimatedTimeInput);
    if (isNaN(hours)) return;
    await _saveField({ estimatedTime: hours.toString() });
  };

  const paneTabs = [
    { id: KanbanCardPane.TASK, icon: TaskDaily01Icon, label: t("kanban.paneTask") },
    { id: KanbanCardPane.DETAILS, icon: SlidersHorizontalIcon, label: t("kanban.paneDetails") },
    { id: KanbanCardPane.COMMENTS, icon: Comment02Icon, label: t("comments.title"), count: commentCount },
  ];

  const timeTrackingContent = (
    <div className="space-y-2">
      <KanbanItemTimer
        totalTime={kanbanItemHook.totalTime}
        currentTime={kanbanItemHook.currentTime}
        isRunning={kanbanItemHook.isRunning}
        formatTimerTime={formatTimerTime}
        onTimerToggle={kanbanItemHook.handleTimerToggle}
        onAddManualTime={kanbanItemHook.handleAddManualTime}
      />
      {item.timeEntries && item.timeEntries.length > 0 && (
        <TimeEntriesAccordion
          timeEntries={item.timeEntries}
          totalTime={kanbanItemHook.totalTime + kanbanItemHook.currentTime}
          formatTimerTime={formatTimerTime}
          usersPublicData={usersPublicData}
          formatDateString={formatDateString}
          formatTimeString={formatTimeString}
          onOpenTimeEntries={() => setShowTimeEntriesModal(true)}
        />
      )}
    </div>
  );

  return (
    <>
      {showTimeEntriesModal && item.timeEntries && (
        <TimeEntriesModal
          isOpen={showTimeEntriesModal}
          onClose={() => setShowTimeEntriesModal(false)}
          timeEntries={item.timeEntries}
          checklistUuid={checklistUuid}
          itemId={item.id}
          onUpdate={onUpdate}
          usersPublicData={usersPublicData}
        />
      )}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <>
            <span className="truncate">{plainItemText(item.text) || t("checklists.untitledTask")}</span>
            <CopyIdButton id={item.id} label={t("kanban.copyCardId", { id: item.id })} />
          </>
        }
        variant={ModalVariant.WORKSPACE}
        flush
        allowEnlarge
        defaultEnlarged
        storageKey="kanban-card-detail"
        width={ModalWidth.XWIDE}
      >
      <div className="kanban-card-detail-body jotty-scrollable-content min-h-0 flex-1 overflow-y-auto overscroll-contain lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
        <PanelTabs
          tabs={paneTabs}
          active={pane}
          onSelect={setPane}
          label={t("kanban.cardPanes")}
          className="sticky top-0 z-10 bg-card lg:hidden"
        />

        <div
          role="tabpanel"
          className={cn(
            "min-w-0 px-6 py-4 lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto",
            pane === KanbanCardPane.DETAILS && DESKTOP_ONLY,
          )}
        >
          <section className={cn("space-y-4", pane === KanbanCardPane.COMMENTS && DESKTOP_ONLY)}>
            <KanbanCardDescription
              boardUuid={checklistUuid}
              markdown={descriptionMarkdown}
              canEdit={canEdit}
              isEditing={isEditing}
              title={editText}
              description={editDescription}
              onTitleChange={setEditText}
              onDescriptionChange={setEditDescription}
              onEdit={() => setIsEditing(true)}
              onSave={handleSave}
              onCancel={_resetEdit}
            />

            {!isEditing && !!item.history?.length && (
              <KanbanCardHistory
                history={item.history}
                formatDateTimeString={formatDateTimeString}
              />
            )}

            {!isEditing && (
              <div className="border-t border-border pt-4">
                <KanbanCardDetailSubtasks
                  item={item}
                  checklist={checklist}
                  canEdit={canEdit}
                  onToggle={handleToggleSubtask}
                  onEdit={handleEditSubtask}
                  onDelete={handleDeleteSubtask}
                  onAddSubtask={handleAddSubtask}
                  onAddNestedSubtask={handleAddNestedSubtask}
                  onToggleAll={handleToggleAll}
                />
              </div>
            )}
          </section>

          <section
            className={cn(
              "lg:mt-4 lg:border-t lg:border-border lg:pt-4",
              _commentsClass(pane, isEditing),
            )}
          >
            <KanbanCardDetailComments
              uuid={checklistUuid}
              itemId={item.id}
              canEdit={canEdit}
              currentUsername={user?.username || ""}
              availableUsers={mentionable}
              onCountChange={setCommentCount}
            />
          </section>
        </div>

        <aside
          className={cn(
            "px-6 py-4 lg:col-start-2 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-border",
            pane !== KanbanCardPane.DETAILS && DESKTOP_ONLY,
          )}
        >
          <KanbanCardDetailProperties
            item={item}
            statuses={statuses}
            statusInput={statusInput}
            priorityInput={priorityInput}
            scoreInput={scoreInput}
            reminderInput={reminderInput}
            targetDateInput={targetDateInput}
            startDateInput={startDateInput}
            estimatedTimeInput={estimatedTimeInput}
            canEdit={canEdit}
            trackedSeconds={kanbanItemHook.totalTime + kanbanItemHook.currentTime}
            onPriorityChange={handlePriorityChange}
            onScoreChange={setScoreInput}
            onScoreSave={handleScoreSave}
            onReminderChange={handleReminderChange}
            onTargetDateChange={handleTargetDateChange}
            onStartDateChange={handleStartDateChange}
            onEstimatedTimeChange={setEstimatedTimeInput}
            onEstimatedTimeSave={handleEstimatedTimeSave}
            formatDateTimeString={formatDateTimeString}
            onStatusChange={handleStatusChange}
            timeTracking={timeTrackingContent}
            assigneePicker={
              <KanbanAssigneePicker
                checklist={checklist}
                item={item}
                people={people}
                canShare={user?.username === checklist.owner || !!user?.isAdmin}
                disabled={assignee.isSaving}
                onPick={assignee.pick}
              />
            }
          />
        </aside>
      </div>
      </Modal>
      <ConfirmModal
        isOpen={!!assignee.pendingShare}
        onClose={assignee.cancelShare}
        onConfirm={assignee.confirmShare}
        title={t("kanban.assigneeShareTitle")}
        message={t("kanban.assigneeShareMessage", { user: assignee.pendingShare || "" })}
        confirmText={t("kanban.assigneeShareConfirm")}
      />
    </>
  );
};
