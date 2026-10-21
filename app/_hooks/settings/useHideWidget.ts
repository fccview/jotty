import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { ToggleState } from "@/app/_types/enums";
import { HOME_WIDGET_COPY, HomeWidgetKey } from "@/app/_consts/home";
import { useSettingSaver } from "@/app/_hooks/settings/useSettingSaver";

export const useHideWidget = (key: HomeWidgetKey) => {
  const t = useTranslations();
  const persist = useSettingSaver();
  const [isHiding, setIsHiding] = useState(false);
  const widget = t(HOME_WIDGET_COPY[key].labelKey);

  const hide = useCallback(async () => {
    setIsHiding(true);
    await persist(
      { [key]: ToggleState.DISABLE },
      {
        label: `home widget ${key}`,
        saved: {
          title: t("browse.widgetHidden", { widget }),
          message: t("browse.widgetHiddenHint"),
        },
      },
    );
    setIsHiding(false);
  }, [key, widget, persist, t]);

  return { hide, isHiding, label: t("browse.hideWidget", { widget }) };
};
