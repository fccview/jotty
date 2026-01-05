"use client";

import { memo, useState } from "react";
import { Clock01Icon, TimeQuarterIcon, Add01Icon } from "hugeicons-react";
import { PauseCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { PromptModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/PromptModal";
import { useTranslations } from "next-intl";

interface KanbanItemTimerProps {
  totalTime: number;
  currentTime: number;
  isRunning: boolean;
  formatTimerTime: (seconds: number) => string;
  onTimerToggle: () => void;
  onAddManualTime: (minutes: number) => void;
}

const KanbanItemTimerComponent = ({
  totalTime,
  currentTime,
  isRunning,
  formatTimerTime,
  onTimerToggle,
  onAddManualTime,
}: KanbanItemTimerProps) => {
  const { permissions } = usePermissions();
  const t = useTranslations();
  const [showTimeModal, setShowTimeModal] = useState(false);

  const handleAddTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTimeModal(true);
  };

  const confirmAddTime = (minutes: string) => {
    if (minutes && !isNaN(Number(minutes))) {
      onAddManualTime(Number(minutes));
    }
  };

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Clock01Icon className="h-3 w-3" />
          <span>{formatTimerTime(totalTime + currentTime)}</span>
        </div>
        <div className="flex" onPointerDown={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            disabled={!permissions?.canEdit}
            onClick={(e) => {
              e.stopPropagation();
              onTimerToggle();
            }}
          >
            {isRunning ? (
              <HugeiconsIcon icon={PauseCircleIcon} className="h-3 w-3" />
            ) : (
              <TimeQuarterIcon className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            disabled={!permissions?.canEdit}
            onClick={handleAddTime}
          >
            <Add01Icon className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <PromptModal
        isOpen={showTimeModal}
        onClose={() => setShowTimeModal(false)}
        onConfirm={confirmAddTime}
        title={t("checklists.addTime")}
        message={t("checklists.enterTimeInMinutes")}
        placeholder="15"
        confirmText={t("common.confirm")}
      />
    </div>
  );
};

export const KanbanItemTimer = memo(KanbanItemTimerComponent);
