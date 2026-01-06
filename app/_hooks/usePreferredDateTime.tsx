import { useMemo } from "react";
import { useAppMode } from "@/app/_providers/AppModeProvider";

const _convertJapaneseAMPM = (dateString: string) => {
  if (dateString.includes("午後")) {
    return `${dateString.replace("午後", '')} PM`
  } else if (dateString.includes("午前")) {
    return `${dateString.replace("午前", '')} AM`
  } 
  
  return dateString;
};

export const usePreferredDateTime = () => {
  const { user } = useAppMode();
  const preferredDateFormat = user?.preferredDateFormat || "dd/mm/yyyy";
  const preferredTimeFormat = user?.preferredTimeFormat || "12-hours";

  /**
   * @fccview here... listen.. if you got here and noticed this know that...
   * YES... I was lazy and I'm using the japanese locale for the ISO 8601 format.
   * This is because the user who implemented this relied on en-US and en-GB for the other two formats
   * and frankly it just works and I don't want to refactor it lol
   *
   * edit - starting to regret this already. Had to replace
   * 午後 with PM 
   * 午前 with AM 
   * to keep am/pm in English. Could refactor but I REALLY want to give a shot out to our japanese friends <3
   * so I created `_convertJapaneseAMPM`. Fun facts all around lately.
   *
   * I'm sure I'll regret this decision in a few months @remindme in 6 months
   */
  const locale =
    preferredDateFormat === "mm/dd/yyyy" ? "en-US" :
    preferredDateFormat === "yyyy/mm/dd" ? "ja-JP" :
    "en-GB";
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
      const formatted = new Date(dateString).toLocaleString(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12,
      });

      return preferredDateFormat === "yyyy/mm/dd"
        ? _convertJapaneseAMPM(formatted)
        : formatted;
    };
  }, [locale, hour12, preferredDateFormat]);

  return {
    formatDateString,
    formatTimeString,
    formatDateTimeString,
  };
};
