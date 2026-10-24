import { useEffect } from "react";
import { useQuickValue } from "@/app/_hooks/settings/useQuickSetting";
import { QuickSettingId } from "@/app/_consts/quick-settings";
import { BORDER_RADIUS_VAR, radiusToRem } from "@/app/_consts/styling";

export const useRadiusOverride = () => {
  const borderRadius = useQuickValue(QuickSettingId.BORDER_RADIUS);

  useEffect(() => {
    const root = document.documentElement;

    if (typeof borderRadius === "number") {
      root.style.setProperty(BORDER_RADIUS_VAR, radiusToRem(borderRadius));
    } else {
      root.style.removeProperty(BORDER_RADIUS_VAR);
    }
  }, [borderRadius]);

  return borderRadius;
};
