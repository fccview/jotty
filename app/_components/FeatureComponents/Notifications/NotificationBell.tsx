"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Notification03Icon, Delete02Icon, Tick02Icon } from "hugeicons-react";
import { useNotifications } from "@/app/_hooks/useNotifications";
import { useTranslations } from "next-intl";
import { NotificationItem } from "./NotificationItem";

export const NotificationBell = () => {
  const t = useTranslations();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications();

  const handleClose = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, handleClose]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center justify-center p-2 rounded-jotty hover:bg-accent transition-colors text-muted-foreground hover:text-accent-foreground"
        aria-label={t("notifications.title")}
      >
        <Notification03Icon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-[2px] right-[2px] flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-full bg-primary text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-background border border-border rounded-jotty shadow-lg z-50 flex flex-col max-h-[420px]">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border flex-shrink-0">
            <span className="text-sm font-semibold text-foreground">
              {t("notifications.title")}
            </span>
            {notifications.length > 0 && (
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded-jotty hover:bg-muted"
                  >
                    <Tick02Icon className="h-3 w-3" />
                    {t("notifications.markAllRead")}
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-1.5 py-1 rounded-jotty hover:bg-muted"
                >
                  <Delete02Icon className="h-3 w-3" />
                  {t("notifications.clearAll")}
                </button>
              </div>
            )}
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Notification03Icon className="h-8 w-8 opacity-30" />
                <p className="text-sm">{t("notifications.empty")}</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  onRemove={removeNotification}
                  onClose={handleClose}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
