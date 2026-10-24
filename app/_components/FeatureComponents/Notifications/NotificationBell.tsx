"use client";

import { useState } from "react";
import { Notification03Icon } from "hugeicons-react";
import { useNotifications } from "@/app/_hooks/useNotifications";
import { useTranslations } from "next-intl";
import { cn } from "@/app/_utils/global-utils";
import { NotificationsPanel } from "./NotificationsPanel";

export const NotificationBell = () => {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const inbox = useNotifications();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "relative flex items-center justify-center p-2 rounded-jotty hover:bg-accent transition-colors text-muted-foreground hover:text-accent-foreground",
          isOpen && "bg-accent text-accent-foreground",
        )}
        aria-label={t("notifications.title")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Notification03Icon className="h-5 w-5" />
        {inbox.unreadCount > 0 && (
          <span className="absolute top-[2px] right-[2px] flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-full bg-primary text-primary-foreground">
            {inbox.unreadCount > 9 ? "9+" : inbox.unreadCount}
          </span>
        )}
      </button>

      <NotificationsPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        {...inbox}
      />
    </>
  );
};
