import { useEffect } from "react";
import { useSettings } from "@/app/_utils/settings-store";
import { BORDER_RADIUS_VAR, radiusToRem } from "@/app/_consts/styling";

export const useRadiusOverride = () => {
  const { borderRadius } = useSettings();

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
