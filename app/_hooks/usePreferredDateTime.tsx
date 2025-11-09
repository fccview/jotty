import { useAppMode } from "../_providers/AppModeProvider";

export const usePreferredDateTime = () => {
  const { user } = useAppMode();
  const preferredDateFormat = user?.preferredDateFormat || "dd/mm/yyyy";
  const preferredTimeFormat = user?.preferredTimeFormat || "12-hours";

  const locale = preferredDateFormat === "mm/dd/yyyy" ? "en-US" : "en-GB";
  const hour12 = preferredTimeFormat === "12-hours";

  const formatDateString = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatTimeString = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12,
    });
  };

  const formatDateTimeString = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12,
    });
  };

  return {
    formatDateString,
    formatTimeString,
    formatDateTimeString,
  };
};
