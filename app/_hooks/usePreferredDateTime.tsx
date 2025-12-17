import { useMemo } from "react";
import { useAppMode } from "@/app/_providers/AppModeProvider";

export const usePreferredDateTime = () => {
  const { user } = useAppMode();
  const preferredDateFormat = user?.preferredDateFormat || "dd/mm/yyyy";
  const preferredTimeFormat = user?.preferredTimeFormat || "12-hours";

  const locale = preferredDateFormat === "mm/dd/yyyy" ? "en-US" : "en-GB";
  const hour12 = preferredTimeFormat === "12-hours";

  const formatDateString = useMemo(() => {
    return (dateString: string) => {
      return new Date(dateString).toLocaleDateString(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    };
  }, [locale]);

  const formatTimeString = useMemo(() => {
    return (dateString: string) => {
      return new Date(dateString).toLocaleDateString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12,
      });
    };
  }, [locale, hour12]);

  const formatDateTimeString = useMemo(() => {
    return (dateString: string) => {
      return new Date(dateString).toLocaleString(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12,
      });
    };
  }, [locale, hour12]);

  return {
    formatDateString,
    formatTimeString,
    formatDateTimeString,
  };
};
