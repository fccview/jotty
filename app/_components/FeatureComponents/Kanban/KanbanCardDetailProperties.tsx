"use client";

import { type ReactNode } from "react";
import { DatePicker, DateTimePicker } from "@/app/_components/GlobalComponents/FormElements/DatePicker";
import { Item, KanbanPriority, KanbanStatus } from "@/app/_types";
import { KanbanPriorityLevel } from "@/app/_types/enums";
import { getPriorityDotColor, getPriorityLabel } from "@/app/_utils/kanban/index";
import { toDateKey } from "@/app/_utils/kanban/calendar-utils";
import { useTranslations } from "next-intl";
import { FALLBACK_STATUS_COLOR, PROPERTY_FIELD_CLASS } from "@/app/_consts/kanban";
import { PropertyDot, PropertyField, PropertySelect } from "./KanbanPropertyFields";

interface KanbanCardDetailPropertiesProps {
  item: Item;
  statuses: KanbanStatus[];
  statusInput: string;
  priorityInput: KanbanPriority;
  scoreInput: string;
  reminderInput: string;
  targetDateInput: string;
  startDateInput: string;
  estimatedTimeInput: string;
  canEdit: boolean;
  trackedSeconds: number;
  onStatusChange: (status: string) => void;
  onPriorityChange: (p: KanbanPriority) => void;
  onScoreChange: (v: string) => void;
  onScoreSave: () => void;
  onReminderChange: (v: string) => void;
  onTargetDateChange: (v: string) => void;
  onStartDateChange: (v: string) => void;
  onEstimatedTimeChange: (v: string) => void;
  onEstimatedTimeSave: () => void;
  formatDateTimeString: (v: string) => string;
  timeTracking?: ReactNode;
  assigneePicker?: ReactNode;
}

const PRIORITIES: KanbanPriority[] = [
  KanbanPriorityLevel.CRITICAL,
  KanbanPriorityLevel.HIGH,
  KanbanPriorityLevel.MEDIUM,
  KanbanPriorityLevel.LOW,
  KanbanPriorityLevel.NONE,
];

const SECTION_CLASS = "space-y-2 border-t border-border pt-4";

const _dotted = (color: string | null, label: string) => (
  <span className="flex min-w-0 items-center gap-2">
    {color && <PropertyDot color={color} />}
    <span className="truncate">{label}</span>
  </span>
);

export const KanbanCardDetailProperties = ({
  item,
  statuses,
  statusInput,
  priorityInput,
  scoreInput,
  reminderInput,
  targetDateInput,
  startDateInput,
  estimatedTimeInput,
  canEdit,
  trackedSeconds,
  onStatusChange,
  onPriorityChange,
  onScoreChange,
  onScoreSave,
  onReminderChange,
  onTargetDateChange,
  onStartDateChange,
  onEstimatedTimeChange,
  onEstimatedTimeSave,
  formatDateTimeString,
  timeTracking,
  assigneePicker,
}: KanbanCardDetailPropertiesProps) => {
  const t = useTranslations();

  const statusOptions = [...statuses]
    .sort((a, b) => a.order - b.order)
    .map((status) => ({
      id: status.id,
      name: _dotted(status.color || FALLBACK_STATUS_COLOR, status.label),
    }));

  const priorityOptions = PRIORITIES.map((priority) => ({
    id: priority,
    name: _dotted(
      priority === KanbanPriorityLevel.NONE ? null : getPriorityDotColor(priority),
      getPriorityLabel(priority, t),
    ),
  }));

  const stamps = [
    item.createdBy &&
      t("common.createdByOn", { user: item.createdBy, date: formatDateTimeString(item.createdAt!) }),
    item.lastModifiedBy &&
      t("common.lastModifiedByOn", {
        user: item.lastModifiedBy,
        date: formatDateTimeString(item.lastModifiedAt!),
      }),
  ].filter((stamp): stamp is string => !!stamp);

  const hasLoggedTime = !!item.estimatedTime && trackedSeconds > 0;

  return (
    <div className="space-y-5">
      {canEdit && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          <PropertyField label={t("kanban.status")}>
            <PropertySelect value={statusInput} options={statusOptions} onChange={onStatusChange} />
          </PropertyField>

          <PropertyField label={t("kanban.priority")}>
            <PropertySelect
              value={priorityInput}
              options={priorityOptions}
              onChange={(value) => {
                const priority = PRIORITIES.find((level) => level === value);
                if (priority) onPriorityChange(priority);
              }}
            />
          </PropertyField>

          {assigneePicker && (
            <PropertyField label={t("kanban.assignee")} wide>
              {assigneePicker}
            </PropertyField>
          )}

          <PropertyField label={t("common.startDate")}>
            <DatePicker
              value={toDateKey(startDateInput)}
              onChange={onStartDateChange}
            />
          </PropertyField>

          <PropertyField label={t("kanban.targetDate")}>
            <DatePicker
              value={toDateKey(targetDateInput)}
              onChange={onTargetDateChange}
            />
          </PropertyField>

          <PropertyField label={t("kanban.reminder")} wide>
            <DateTimePicker value={reminderInput} onChange={onReminderChange} />
          </PropertyField>

          <PropertyField label={t("kanban.score")}>
            <input
              type="number"
              min="0"
              max="100"
              value={scoreInput}
              onChange={(e) => onScoreChange(e.target.value)}
              onBlur={onScoreSave}
              onKeyDown={(e) => e.key === "Enter" && onScoreSave()}
              className={PROPERTY_FIELD_CLASS}
              placeholder="0"
            />
          </PropertyField>

          <PropertyField label={t("kanban.estimatedTime")}>
            <input
              type="number"
              min="0"
              step="0.5"
              value={estimatedTimeInput}
              onChange={(e) => onEstimatedTimeChange(e.target.value)}
              onBlur={onEstimatedTimeSave}
              onKeyDown={(e) => e.key === "Enter" && onEstimatedTimeSave()}
              className={PROPERTY_FIELD_CLASS}
              placeholder="0"
            />
          </PropertyField>

          {hasLoggedTime && (
            <p className="col-span-2 -mt-2 text-xs text-muted-foreground">
              {t("kanban.actualVsEstimated", {
                actual: (trackedSeconds / 3600).toFixed(1) + "h",
                estimated: item.estimatedTime + "h",
              })}
            </p>
          )}
        </div>
      )}

      {timeTracking && (
        <div className={SECTION_CLASS}>
          <span className="block text-xs font-medium text-muted-foreground">
            {t("kanban.timeTracking")}
          </span>
          {timeTracking}
        </div>
      )}

      {stamps.length > 0 && (
        <div className="space-y-1 border-t border-dashed border-border pt-4">
          {stamps.map((text) => (
            <p key={text} className="text-xs text-muted-foreground">
              {text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
