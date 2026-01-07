import { cn } from "@/app/_utils/global-utils";
import { AlertCircleIcon, Tick02Icon } from "hugeicons-react";

interface FeedbackMessageProps {
  error: string | null;
  success: string | null;
}

export const FeedbackMessage = ({ error, success }: FeedbackMessageProps) => {
  if (!error && !success) return null;
  const isError = !!error;

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 border rounded-jotty",
        isError
          ? "bg-destructive/10 border-destructive/20"
          : "bg-primary/10 border-primary/20"
      )}
    >
      {isError ? (
        <AlertCircleIcon className="h-4 w-4 text-destructive" />
      ) : (
        <Tick02Icon className="h-4 w-4 text-primary" />
      )}
      <span
        className={cn("text-md lg:text-sm", isError ? "text-destructive" : "text-primary")}
      >
        {error || success}
      </span>
    </div>
  );
};
