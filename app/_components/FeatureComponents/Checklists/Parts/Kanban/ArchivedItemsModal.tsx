"use client";

import { useState, useMemo } from "react";
import { Archive02Icon } from "hugeicons-react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Item, KanbanStatus } from "@/app/_types";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { TaskStatus } from "@/app/_types/enums";
import { HugeiconsIcon } from "@hugeicons/react";
import { Undo02Icon } from "@hugeicons/core-free-icons";
import { useTranslations } from "next-intl";
import { usePreferredDateTime } from "@/app/_hooks/usePreferredDateTime";

interface ArchivedItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivedItems: Item[];
  onUnarchive: (itemId: string) => void;
  statuses: KanbanStatus[];
}

const defaultStatusColors: Record<string, string> = {
  [TaskStatus.TODO]: "#6b7280",
  [TaskStatus.IN_PROGRESS]: "#3b82f6",
  [TaskStatus.COMPLETED]: "#10b981",
  [TaskStatus.PAUSED]: "#f59e0b",
};

export const ArchivedItemsModal = ({
  isOpen,
  onClose,
  archivedItems,
  onUnarchive,
  statuses,
}: ArchivedItemsModalProps) => {
  const t = useTranslations();
  const { formatDateString } = usePreferredDateTime();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const statusMap = useMemo(() => {
    const map: Record<string, KanbanStatus> = {};
    statuses.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [statuses]);

  const filteredItems = useMemo(() => {
    if (filterStatus === "all") return archivedItems;
    return archivedItems.filter((item) => item.previousStatus === filterStatus);
  }, [archivedItems, filterStatus]);

  const getStatusColor = (statusId: string) => {
    const status = statusMap[statusId];
    return status?.color || defaultStatusColors[statusId] || "#6b7280";
  };

  const getStatusLabel = (statusId: string) => {
    const status = statusMap[statusId];
    return status?.label || statusId;
  };

  const statusFilterOptions = [
    { id: "all", name: "All Statuses" },
    ...statuses.map((s) => ({ id: s.id, name: s.label })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("checklists.archivedItems")}
      className="lg:max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">{t('common.filterByStatus')}:</label>
          <Dropdown
            value={filterStatus}
            options={statusFilterOptions}
            onChange={setFilterStatus}
            className="w-48"
          />
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Archive02Icon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>
              {t('common.noArchivedItems')}
              {filterStatus !== "all" ? ` ${t('common.withThisStatus')}` : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-3 border-l-4 border rounded-jotty bg-muted/30"
                style={{
                  borderLeftColor: item.previousStatus
                    ? getStatusColor(item.previousStatus)
                    : "#6b7280",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.archivedAt && (
                      <p className="text-xs text-muted-foreground">
                        {t('common.archived')}{" "}
                        {formatDateString(item.archivedAt)}
                        {item.archivedBy && ` ${t('common.by')} ${item.archivedBy}`}
                      </p>
                    )}
                  </div>
                  {item.previousStatus && (
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: getStatusColor(item.previousStatus),
                        }}
                      />
                      <p className="text-xs font-medium">
                        {getStatusLabel(item.previousStatus)}
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUnarchive(item.id)}
                  className="shrink-0"
                >
                  <HugeiconsIcon icon={Undo02Icon} className="h-3 w-3 mr-1" />
                  {t('common.restore')}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    </Modal>
  );
};
