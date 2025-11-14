import { Check, AlertCircle } from "lucide-react";

interface FeedbackMessageProps {
  error: string | null;
  success: string | null;
}

export const FeedbackMessage = ({ error, success }: FeedbackMessageProps) => {
  if (!error && !success) return null;
  const isError = !!error;
  return (
    <div
      className={`jotty-feedback-message flex items-center gap-2 p-3 rounded-md border ${
        isError
          ? "bg-destructive/10 border-destructive/20"
          : "bg-primary/10 border-primary/20"
      }`}
    >
      {isError ? (
        <AlertCircle className="h-4 w-4 text-destructive" />
      ) : (
        <Check className="h-4 w-4 text-primary" />
      )}
      <span
        className={`text-sm ${isError ? "text-destructive" : "text-primary"}`}
      >
        {error || success}
      </span>
    </div>
  );
};
