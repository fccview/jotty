"use client";

import { CheckmarkSquare04Icon, TaskDaily01Icon } from "hugeicons-react";
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
  simple: { Icon: CheckmarkSquare04Icon },
  task: { Icon: TaskDaily01Icon },
};

const TypeDisplay = ({ type, label }: { type: ChecklistType; label: string }) => {
  const { Icon } = TYPE_CONFIG[type];
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-md lg:text-sm font-medium text-foreground">{label}</span>
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
    t("checklists.allTaskStatusesReset"),
    t("checklists.timeTrackingDataLost"),
    t("checklists.estimatedTimesRemoved"),
    t("checklists.targetDatesCleared"),
  ];

  const ENHANCED_FEATURES = [
    t("checklists.kanbanBoardWithDragDrop"),
    t("checklists.taskStatusTracking"),
    t("checklists.timeTrackingWithTimer"),
  ];

  const currentLabel = currentType === "simple"
    ? t("checklists.simpleChecklist")
    : t("checklists.taskProject");

  const newLabel = newType === "simple"
    ? t("checklists.simpleChecklist")
    : t("checklists.taskProject");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("checklists.convertChecklistType")}>
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3 p-3 bg-muted/50 rounded-jotty">
          <TypeDisplay type={currentType} label={currentLabel} />
          <span className="text-muted-foreground">→</span>
          <TypeDisplay type={newType} label={newLabel} />
        </div>

        {isDestructive ? (
          <InfoBox
            title={t("checklists.dataLossWarning")}
            items={DATA_LOSS_WARNINGS}
            variant="warning"
          />
        ) : (
          <InfoBox
            title={t("checklists.enhancedFeatures")}
            items={ENHANCED_FEATURES}
            variant="info"
          />
        )}

        <p className="text-md lg:text-sm text-muted-foreground">
          {isDestructive
            ? t("checklists.actionCannotBeUndone")
            : t("checklists.actionCannotBeUndone")}
        </p>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onClose} className="flex-1">
          {t("common.cancel")}
        </Button>
        <Button
          variant={isDestructive ? "destructive" : "default"}
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="flex-1"
        >
          {isDestructive ? t("checklists.convertAndLoseData") : t("checklists.convert")}
        </Button>
      </div>
    </Modal>
  );
};
