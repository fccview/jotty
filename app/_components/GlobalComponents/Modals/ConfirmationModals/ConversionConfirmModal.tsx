"use client";

import { AlertTriangle, CheckSquare, BarChart3 } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { ChecklistType } from "@/app/_types";
import { InfoBox } from "../../Cards/InfoBox";
import { useTranslations } from "next-intl";

interface ConversionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentType: ChecklistType;
  newType: ChecklistType;
}

const TYPE_CONFIG = {
  simple: { label: "Simple Checklist", Icon: CheckSquare },
  task: { label: "Task Project", Icon: BarChart3 },
};

const TypeDisplay = ({ type }: { type: ChecklistType }) => {
  const { label, Icon } = TYPE_CONFIG[type];
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
  );
};

export const ConversionConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  currentType,
  newType,
}: ConversionConfirmModalProps) => {
  const t = useTranslations();
  const isDestructive = newType === "simple" && currentType === "task";

  const DATA_LOSS_WARNINGS = [
    t("modals.all_task_statuses_reset"),
    t("modals.time_tracking_lost"),
    t("modals.estimated_times_removed"),
    t("modals.target_dates_cleared"),
  ];

  const ENHANCED_FEATURES = [
    t("modals.kanban_board"),
    t("modals.task_status_tracking"),
    t("modals.time_tracking"),
    t("modals.estimated_times"),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("modals.convert_checklist_type")}
      titleIcon={<AlertTriangle className="h-5 w-5 text-destructive" />}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3 p-3 bg-muted/50 rounded-lg">
          <TypeDisplay type={currentType} t={t} />
          <span className="text-muted-foreground">→</span>
          <TypeDisplay type={newType} t={t} />
        </div>

        {isDestructive ? (
          <InfoBox
            title={`⚠️ ${t("modals.data_loss_warning")}`}
            items={DATA_LOSS_WARNINGS}
            variant="warning"
          />
        ) : (
          <InfoBox
            title={`✨ ${t("modals.enhanced_features")}`}
            items={ENHANCED_FEATURES}
            variant="info"
          />
        )}

        <p className="text-sm text-muted-foreground">
          {isDestructive
            ? t("modals.cannot_be_undone")
            : t("modals.sure_to_convert")}
        </p>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onClose} className="flex-1">
          {t("global.cancel")}
        </Button>
        <Button
          variant={isDestructive ? "destructive" : "default"}
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="flex-1"
        >
          {isDestructive ? t("modals.convert_lose_data") : t("modals.convert")}
        </Button>
      </div>
    </Modal>
  );
};
