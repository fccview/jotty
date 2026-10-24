"use client";

import { useTranslations } from "next-intl";
import { Delete02Icon, Notification03Icon, Tick02Icon } from "hugeicons-react";
import { AppNotification } from "@/app/_types";
import { KICKER_CLASS } from "@/app/_consts/styling";
import { cn } from "@/app/_utils/global-utils";
import { Modal, ModalVariant } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { NotificationItem } from "./NotificationItem";

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

interface InboxGroupProps {
  id: string;
  title: string;
  items: AppNotification[];
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

const InboxGroup = ({ id, title, items, onRead, onRemove, onClose }: InboxGroupProps) => {
  if (!items.length) return null;

  return (
    <section
      aria-labelledby={id}
      className="jotty-notifications-group py-3 border-t border-dashed border-border first:border-t-0"
    >
      <div className="flex items-center justify-between gap-3 px-6 pt-1 pb-2">
        <h3 id={id} className={KICKER_CLASS}>
          {title}
        </h3>
        <span className={cn(KICKER_CLASS, "text-primary")}>{items.length}</span>
      </div>
      <ul className="flex flex-col">
        {items.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRead={onRead}
            onRemove={onRemove}
            onClose={onClose}
          />
        ))}
      </ul>
    </section>
  );
};

const EmptyInbox = () => {
  const t = useTranslations("notifications");

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-jotty border border-dashed border-border bg-muted/40">
        <Notification03Icon className="h-6 w-6 text-muted-foreground/60" />
      </span>
      <div>
        <p className="text-md lg:text-sm font-medium text-foreground">{t("empty")}</p>
        <p className="mt-1 text-sm lg:text-xs text-muted-foreground">{t("emptyHint")}</p>
      </div>
    </div>
  );
};

export const NotificationsPanel = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAll,
}: NotificationsPanelProps) => {
  const t = useTranslations();
  const unread = notifications.filter(({ readAt }) => !readAt);
  const read = notifications.filter(({ readAt }) => readAt);
  const groupProps = { onRead: markAsRead, onRemove: removeNotification, onClose };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant={ModalVariant.PANEL}
      kicker={
        unreadCount > 0 ? (
          <span className="text-primary">
            {t("notifications.unreadCount", { count: unreadCount })}
          </span>
        ) : (
          t("notifications.allCaughtUp")
        )
      }
      title={t("notifications.title")}
      description={t("notifications.subtitle")}
      flush
      footer={(close) => (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="gap-1.5">
                <Tick02Icon className="h-4 w-4" />
                {t("notifications.markAllRead")}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Delete02Icon className="h-4 w-4" />
                {t("notifications.clearAll")}
              </Button>
            )}
          </div>
          <Button size="sm" onClick={close}>
            {t("common.done")}
          </Button>
        </div>
      )}
    >
      {notifications.length === 0 ? (
        <EmptyInbox />
      ) : (
        <>
          <InboxGroup
            id="notifications-unread"
            title={t("notifications.newGroup")}
            items={unread}
            {...groupProps}
          />
          <InboxGroup
            id="notifications-read"
            title={t("notifications.earlierGroup")}
            items={read}
            {...groupProps}
          />
        </>
      )}
    </Modal>
  );
};
