"use client";

import { plainItemText } from "@/app/_utils/item-href-utils";
import { useState, useMemo } from "react";
import { Archive02Icon } from "hugeicons-react";
import { Modal, ModalVariant, ModalWidth } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Item, KanbanStatus } from "@/app/_types";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { FALLBACK_STATUS_COLOR, statusColor } from "@/app/_consts/kanban";
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
    return statusColor(statusMap[statusId] || { id: statusId });
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
      variant={ModalVariant.PANEL}
      width={ModalWidth.WIDE}
      footer={(close) => (
        <div className="flex justify-end">
          <Button variant="outline" onClick={close}>{t('common.close')}</Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-md lg:text-sm font-medium">{t('common.filterByStatus')}:</label>
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
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-3 border-l-4 border rounded-jotty bg-muted/30"
                style={{
                  borderLeftColor: item.previousStatus
                    ? getStatusColor(item.previousStatus)
                    : FALLBACK_STATUS_COLOR,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-md lg:text-sm font-medium truncate">{plainItemText(item.text)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.archivedAt && (
                      <p className="text-md lg:text-xs text-muted-foreground">
                        {t('common.archived')}{" "}
                        {formatDateString(item.archivedAt)}
                        {item.archivedBy && ` ${t('common.by', { owner: item.archivedBy })}`}
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
                      <p className="text-md lg:text-xs font-medium">
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
      </div>
    </Modal>
  );
};
