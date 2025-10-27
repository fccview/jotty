"use client";

import { Clock, Timer, Pause, Plus } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";

interface KanbanItemTimerProps {
  totalTime: number;
  currentTime: number;
  isRunning: boolean;
  formatTimerTime: (seconds: number) => string;
  onTimerToggle: () => void;
  onAddManualTime: (minutes: number) => void;
}

export const KanbanItemTimer = ({
  totalTime,
  currentTime,
  isRunning,
  formatTimerTime,
  onTimerToggle,
  onAddManualTime,
}: KanbanItemTimerProps) => {
  const t = useTranslations();

  const handleAddTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    const minutes = prompt(t("checklists.enter_time_minutes"));
    if (minutes && !isNaN(Number(minutes))) {
      onAddManualTime(Number(minutes));
    }
  };

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formatTimerTime(totalTime + currentTime)}</span>
        </div>
        <div className="flex" onPointerDown={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onTimerToggle();
            }}
          >
            {isRunning ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Timer className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={handleAddTime}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};
