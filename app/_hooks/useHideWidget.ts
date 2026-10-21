import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useToast } from "@/app/_providers/ToastProvider";
import { updateUserSettings } from "@/app/_server/actions/users";
import { HomeWidget } from "@/app/_types/enums";
import { HomeWidgetKey } from "@/app/_consts/home";

export const WIDGET_LABELS: Record<HomeWidgetKey, string> = {
  homeWelcome: "settings.homeWelcome",
  homePickUp: "settings.homePickUp",
  homePinboard: "settings.homePinboard",
  homeTags: "settings.homeTags",
};

export const useHideWidget = (key: HomeWidgetKey) => {
  const t = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const { setUser } = useAppMode();
  const [isHiding, setIsHiding] = useState(false);
  const widget = t(WIDGET_LABELS[key]);

  const hide = useCallback(async () => {
    setIsHiding(true);
    try {
      const result = await updateUserSettings({ [key]: HomeWidget.DISABLE });
      if (!result.success || !result.data?.user) {
        console.error(`Failed to hide home widget ${key}:`, result.error);
        showToast({
          type: "error",
          title: t("settings.settingsSaveFailed"),
          message: t("settings.settingsSaveFailedDescription"),
        });
        return;
      }

      setUser(result.data.user);
      showToast({
        type: "success",
        title: t("browse.widgetHidden", { widget }),
        message: t("browse.widgetHiddenHint"),
      });
      router.refresh();
    } catch (error) {
      console.error(`Failed to hide home widget ${key}:`, error);
      showToast({
        type: "error",
        title: t("settings.settingsSaveFailed"),
        message: t("settings.settingsSaveFailedDescription"),
      });
    } finally {
      setIsHiding(false);
    }
  }, [key, widget, setUser, showToast, router, t]);

  return { hide, isHiding, label: t("browse.hideWidget", { widget }) };
};
