import {
  AlarmClockIcon,
  UserCheck01Icon,
  Share05Icon,
  AlertCircleIcon,
  MultiplicationSignIcon,
  ArrowRight01Icon,
  Tick02Icon,
  AtIcon,
} from "hugeicons-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { AppNotification, NotificationType } from "@/app/_types";

import { cn } from "@/app/_utils/global-utils";

const ACTION_CLASS =
  "flex h-7 w-7 items-center justify-center rounded-jotty text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const _getTypeIcon = (type: NotificationType) => {
  switch (type) {
    case "reminder":
      return <AlarmClockIcon className="h-4 w-4 text-amber-500" />;
    case "assignment":
      return <UserCheck01Icon className="h-4 w-4 text-blue-500" />;
    case "sharing":
      return <Share05Icon className="h-4 w-4 text-primary" />;
    case "mention":
      return <AtIcon className="h-4 w-4 text-purple-500" />;
    default:
      return <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />;
  }
};

interface NotificationItemProps {
  notification: AppNotification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export const NotificationItem = ({
  notification,
  onRead,
  onRemove,
  onClose,
}: NotificationItemProps) => {
  const router = useRouter();
  const t = useTranslations();
  const tn = useTranslations("notifications");
  const format = useFormatter();
  const isUnread = !notification.readAt;

  const title = notification.titleKey
    ? tn(notification.titleKey, notification.messageVars)
    : notification.title;
  const message = notification.messageKey
    ? tn(notification.messageKey, notification.messageVars)
    : notification.message;

  const handleOpen = () => {
    if (!notification.link) return;
    if (isUnread) onRead(notification.id);
    router.push(notification.link);
    onClose();
  };

  const body = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-jotty bg-muted/70">
        {_getTypeIcon(notification.type)}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-md lg:text-sm leading-snug text-foreground",
            isUnread ? "font-semibold" : "font-medium",
          )}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-sm lg:text-xs leading-snug text-muted-foreground">
          {message}
        </span>
        <span className="mt-1.5 flex items-center gap-2 font-mono text-[11px] text-muted-foreground/70">
          <time dateTime={notification.createdAt}>
            {format.relativeTime(new Date(notification.createdAt), new Date())}
          </time>
          {notification.link && (
            <span className="flex items-center gap-0.5 text-primary">
              {t("common.view")}
              <ArrowRight01Icon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </span>
      </span>
    </>
  );

  return (
    <li
      className={cn(
        "jotty-notification-item group relative flex items-start gap-2 px-6 py-3 transition-colors",
        notification.link && "hover:bg-muted/40",
      )}
    >
      {isUnread && (
        <span
          aria-hidden="true"
          className="absolute left-2.5 top-[1.6rem] h-1.5 w-1.5 rounded-full bg-primary"
        />
      )}
      {notification.link ? (
        <button
          type="button"
          onClick={handleOpen}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-jotty text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{body}</div>
      )}
      <div className="flex shrink-0 items-center gap-0.5 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
        {isUnread && (
          <button
            type="button"
            onClick={() => onRead(notification.id)}
            className={cn(ACTION_CLASS, "hover:bg-muted hover:text-foreground")}
            aria-label={tn("markRead")}
            title={tn("markRead")}
          >
            <Tick02Icon className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(notification.id)}
          className={cn(ACTION_CLASS, "hover:bg-destructive/10 hover:text-destructive")}
          aria-label={t("common.remove")}
          title={t("common.remove")}
        >
          <MultiplicationSignIcon className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
};
