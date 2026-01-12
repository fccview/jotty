"use client";

import { useState, useEffect } from "react";
import {
  MultiplicationSignIcon,
  Tick02Icon,
  AlertCircleIcon,
} from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";

export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  title: React.ReactNode;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

export const Toast = ({ toast, onRemove }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);

    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration || 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, toast.duration, onRemove]);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <Tick02Icon className="h-4 w-4 text-primary" />;
      case "error":
        return <AlertCircleIcon className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircleIcon className="h-4 w-4 text-primary" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return "bg-muted border-primary text-muted-foreground";
      case "error":
        return "bg-muted border-destructive text-muted-foreground";
      default:
        return "bg-muted border-primary text-muted-foreground";
    }
  };

  return (
    <div
      className={cn(
        "jotty-toast flex items-start gap-3 p-4 rounded-jotty border-b-2 shadow-lg transition-all duration-300 transform",
        getStyles(),
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-md lg:text-sm font-medium">{toast.title}</p>
        {toast.message && (
          <p className="text-md lg:text-sm opacity-90 mt-1">{toast.message}</p>
        )}
      </div>
      <button
        onClick={handleRemove}
        className="flex-shrink-0 p-1 rounded-jotty hover:bg-black/10 transition-colors"
      >
        <MultiplicationSignIcon className="h-4 w-4" />
      </button>
    </div>
  );
};
