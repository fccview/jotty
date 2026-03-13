import {
  AlarmClockIcon,
  UserCheck01Icon,
  Share05Icon,
  AlertCircleIcon,
  MultiplicationSignIcon,
  ArrowRight01Icon,
  Tick02Icon,
} from "hugeicons-react";
import { useRouter } from "next/navigation";
import { AppNotification, NotificationType } from "@/app/_types";

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

export const NotificationItem = ({
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
