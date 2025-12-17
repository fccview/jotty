"use client";

import { useState } from "react";
import { Clock01Icon, ArrowDown01Icon, ArrowRight01Icon } from "hugeicons-react";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { usePreferredDateTime } from "@/app/_hooks/usePreferredDateTime";

interface TimeEntriesAccordionProps {
  timeEntries: any[];
  totalTime: number;
  formatTimerTime: (seconds: number) => string;
}

export const TimeEntriesAccordion = ({
  timeEntries,
  totalTime,
  formatTimerTime,
}: TimeEntriesAccordionProps) => {
  const { usersPublicData } = useAppMode();
  const { formatDateString, formatTimeString } = usePreferredDateTime();

  const getUserAvatarUrl = (username: string) => {
    if (!usersPublicData) return "";

    return (
      usersPublicData.find(
        (user) => user.username?.toLowerCase() === username?.toLowerCase()
      )?.avatarUrl || ""
    );
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border/30 rounded-md bg-muted/20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Clock01Icon className="h-3 w-3" />
          <span className="font-medium text-left">
            {timeEntries.length} sessions
          </span>
          <span className="text-muted-foreground/60">•</span>
          <span className="font-semibold text-foreground">
            {formatTimerTime(totalTime)}
          </span>
        </span>
        {isOpen ? (
          <ArrowDown01Icon className="h-3 w-3" />
        ) : (
          <ArrowRight01Icon className="h-3 w-3" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border/30 py-2 space-y-1.5 max-h-32 overflow-y-auto">
          {timeEntries.map((entry, index) => (
            <div
              key={entry.id || index}
              className="bg-background/50 border border-border/50 rounded p-2"
            >
              <div className="flex gap-1.5 items-center">
                {entry.user && (
                  <UserAvatar
                    username={entry.user}
                    size="xs"
                    avatarUrl={getUserAvatarUrl(entry.user) || ""}
                  />
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {formatTimerTime(entry.duration || 0)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatTimeString(entry.startTime)}
                </span>
              </div>
              {entry.endTime && (
                <div className="text-xs text-muted-foreground/70 mt-0.5">
                  {formatDateString(entry.startTime)} •{" "}
                  {formatTimeString(entry.endTime)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
