"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  Notification03Icon,
  AlarmClockIcon,
  UserCheck01Icon,
  Share05Icon,
  AlertCircleIcon,
  MultiplicationSignIcon,
  Delete02Icon,
  ArrowRight01Icon,
  Tick02Icon,
} from "hugeicons-react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/app/_hooks/useNotifications";
import { AppNotification, NotificationType } from "@/app/_types";
import { useTranslations } from "next-intl";
import { cn } from "@/app/_utils/global-utils";

const _formatRelativeTime = (isoStr: string): string => {
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

const _getTypeIcon = (type: NotificationType) => {
  switch (type) {
    case "reminder":
      return (
        <AlarmClockIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
      );
    case "assignment":
      return (
        <UserCheck01Icon className="h-4 w-4 text-blue-500 flex-shrink-0" />
      );
    case "sharing":
      return <Share05Icon className="h-4 w-4 text-primary flex-shrink-0" />;
    default:
      return (
        <AlertCircleIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      );
  }
};

interface NotificationItemProps {
  notification: AppNotification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

const NotificationItem = ({
  notification,
  onRead,
  onRemove,
  onClose,
}: NotificationItemProps) => {
  const router = useRouter();

  const handleClick = () => {
    if (notification.link) {
      router.push(notification.link);
      onClose();
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-3 py-3 transition-colors",
        !notification.readAt && "border-l-2 border-primary",
        notification.link ? "cursor-pointer hover:bg-accent" : "cursor-default",
      )}
    >
      <div
        className="flex items-start gap-3 flex-1 min-w-0"
        onClick={handleClick}
      >
        <span className="mt-0.5">{_getTypeIcon(notification.type)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground/60">
              {_formatRelativeTime(notification.createdAt)}
            </span>
            {notification.link && (
              <span className="text-[10px] text-primary flex items-center gap-0.5">
                <ArrowRight01Icon className="h-2.5 w-2.5" />
                View
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
        {!notification.readAt && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRead(notification.id);
            }}
            className="p-1 rounded-jotty hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Mark as read"
          >
            <Tick02Icon className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(notification.id);
          }}
          className="p-1 rounded-jotty hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
          title="Remove"
        >
          <MultiplicationSignIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

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
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-full bg-primary text-primary-foreground">
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
