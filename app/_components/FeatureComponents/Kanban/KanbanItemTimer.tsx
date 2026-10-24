"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Clock01Icon, TimeQuarterIcon, Add01Icon } from "hugeicons-react";
import { PauseCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { useTranslations } from "next-intl";
import { MENU_CLASS } from "@/app/_consts/styling";

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
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function _handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTimeDropdown(false);
      }
    }
    if (showTimeDropdown) {
      document.addEventListener("mousedown", _handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", _handleClickOutside);
  }, [showTimeDropdown]);

  function handleAddTime(e: React.MouseEvent) {
    e.stopPropagation();
    setShowTimeDropdown(!showTimeDropdown);
  }

  function _handlePreset(minutes: number) {
    onAddManualTime(minutes);
    setShowTimeDropdown(false);
  }

  function _handleCustomSubmit() {
    if (customMinutes && !isNaN(Number(customMinutes))) {
      onAddManualTime(Number(customMinutes));
      setCustomMinutes("");
      setShowTimeDropdown(false);
    }
  }

  return (
    <div className={cn(
      "relative flex items-center justify-between text-sm lg:text-xs text-muted-foreground pt-1",
      isRunning && "bg-primary/10 border border-primary/30 rounded-jotty p-1"
    )}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Clock01Icon className={cn("h-3 w-3", isRunning && "animate-pulse")} />
          <span>{formatTimerTime(totalTime + currentTime)}</span>
        </div>
        <div className="flex" onPointerDown={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={!permissions?.canEdit}
            title={isRunning ? "Pause timer" : "Start timer"}
            aria-label={isRunning ? "Pause timer" : "Start timer"}
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
            className="h-8 w-8 p-0"
            disabled={!permissions?.canEdit}
            title="Add manual time"
            aria-label="Add manual time"
            onClick={handleAddTime}
          >
            <Add01Icon className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {showTimeDropdown && (
        <div
          ref={dropdownRef}
          className={`absolute bottom-full mb-1 right-0 z-50 p-2 min-w-[160px] ${MENU_CLASS}`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-medium text-muted-foreground mb-1.5">{t("checklists.addTime")}</div>
          <div className="grid grid-cols-2 gap-1 mb-2">
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => _handlePreset(15)}>15m</Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => _handlePreset(30)}>30m</Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => _handlePreset(60)}>1h</Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => _handlePreset(120)}>2h</Button>
          </div>
          <div className="flex gap-1">
            <input
              type="number"
              min="1"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && _handleCustomSubmit()}
              placeholder={t("checklists.enterTimeInMinutes")}
              className="flex-1 px-2 py-1 text-xs bg-background border border-input rounded-jotty focus:outline-none focus:border-ring min-w-0"
            />
            <Button variant="default" size="sm" className="text-xs h-7 px-2" onClick={_handleCustomSubmit}>{t("common.confirm")}</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const KanbanItemTimer = memo(KanbanItemTimerComponent);
