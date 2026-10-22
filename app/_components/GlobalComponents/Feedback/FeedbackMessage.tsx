import { ReactNode } from "react";
import { Tick02Icon, AlertCircleIcon, Alert02Icon } from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";

interface FeedbackMessageProps {
  error: string | null;
  success: string | null;
  warning?: string | null;
  icon?: ReactNode;
}

const TONES = {
  error: { box: "bg-destructive/10 border-destructive/20", text: "text-destructive" },
  warning: { box: "bg-warning/10 border-warning/25", text: "text-warning" },
  success: { box: "bg-primary/10 border-primary/20", text: "text-primary" },
};

const ICONS = {
  error: AlertCircleIcon,
  warning: Alert02Icon,
  success: Tick02Icon,
};

export const FeedbackMessage = ({ error, success, warning, icon }: FeedbackMessageProps) => {
  const message = error || warning || success;
  if (!message) return null;

  const tone = error ? "error" : warning ? "warning" : "success";
  const Icon = ICONS[tone];

  return (
    <div
      role={error ? "alert" : "status"}
      className={cn("jotty-feedback-message flex items-center gap-2 p-3 rounded-jotty border", TONES[tone].box)}
    >
      <span className={cn("shrink-0 [&>svg]:h-4 [&>svg]:w-4", TONES[tone].text)}>
        {icon ?? <Icon />}
      </span>
      <span className={cn("text-sm", TONES[tone].text)}>{message}</span>
    </div>
  );
};
