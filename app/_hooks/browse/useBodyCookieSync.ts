import { useEffect } from "react";
import { useQuickValue } from "@/app/_hooks/settings/useQuickSetting";
import { QuickSettingId } from "@/app/_consts/quick-settings";
import { DESKTOP_QUERY } from "@/app/_consts/browse";
import { bodyNeedOf, syncBodyCookie } from "@/app/_utils/browse/body-cookie";

export const useBodyCookieSync = () => {
  const showMarkdownPreview = useQuickValue(QuickSettingId.CARD_PREVIEW);
  const viewMode = useQuickValue(QuickSettingId.VIEW_MODE);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const sync = () =>
      syncBodyCookie(bodyNeedOf({ showMarkdownPreview, viewMode, isDesktop: media.matches }));

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [showMarkdownPreview, viewMode]);
};
