import { useQuickValue } from "@/app/_hooks/settings/useQuickSetting";
import { QuickSettingId } from "@/app/_consts/quick-settings";

export const useShowEmojis = (ownerChoice?: boolean): boolean => {
  const showEmojis = useQuickValue(QuickSettingId.SHOW_EMOJIS);
  return ownerChoice ?? showEmojis;
};
