"use client";

import { useWebSocket } from "@/app/_providers/WebSocketProvider";
import { useEffect, useState } from "react";
import { cn } from "@/app/_utils/global-utils";
import { useTranslations } from "next-intl";
import { useAppMode } from "@/app/_providers/AppModeProvider";

interface ConnectionIndicatorProps {
  borderColor?: string;
}

export const ConnectionIndicator = ({
  borderColor = "border-background",
}: ConnectionIndicatorProps) => {
  const { isConnected } = useWebSocket();
  const { user } = useAppMode();
  const [isOffline, setIsOffline] = useState(false);
  const t = useTranslations();
  const hidden = !isOffline && user?.hideConnectionIndicator === "enable";

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  const label = isOffline
    ? `${t('common.offline')}`
    : isConnected
      ? t('common.connected')
      : t('common.reconnecting');

  if (hidden) return null;

  return (
    <span className="group">
      <span
        className={cn(
          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-[3px]",
          borderColor,
          isOffline
            ? "bg-destructive"
            : isConnected
              ? "bg-green-500 animate-[jotty-pulse-connected_3s_ease-in-out_infinite]"
              : "bg-orange-400"
        )}
      />
      <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-0.5 text-[10px] text-background opacity-0 transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </span>
  );
};
