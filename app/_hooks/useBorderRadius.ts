import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/app/_providers/ToastProvider";
import {
  getBorderRadius,
  saveBorderRadius,
} from "@/app/_server/actions/config";
import {
  ADMIN_BORDER_RADIUS_VAR,
  DEFAULT_BORDER_RADIUS,
  clampRadius,
  radiusToRem,
} from "@/app/_consts/styling";

const applyRadius = (radius: number) => {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(
    ADMIN_BORDER_RADIUS_VAR,
    radiusToRem(radius),
  );
};

export const useBorderRadius = () => {
  const t = useTranslations();
  const { showToast } = useToast();

  const [radius, setRadius] = useState(DEFAULT_BORDER_RADIUS);
  const [savedRadius, setSavedRadius] = useState(DEFAULT_BORDER_RADIUS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getBorderRadius();
        if (result.success) {
          const current = clampRadius(result.data);
          setRadius(current);
          setSavedRadius(current);
        } else {
          throw new Error(result.error || "Failed to load border radius");
        }
      } catch (error) {
        console.error("Failed to load border radius:", error);
        showToast({
          type: "error",
          title: t("errors.loadError"),
          message: t("admin.borderRadiusLoadError"),
        });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [showToast]);

  const handleRadiusChange = (value: number) => {
    const next = clampRadius(value);
    setRadius(next);
    applyRadius(next);
  };

  const handleResetRadius = () => {
    handleRadiusChange(savedRadius);
  };

  const handleSaveRadius = async () => {
    setIsSaving(true);
    try {
      const result = await saveBorderRadius(radius);
      if (!result.success) {
        throw new Error(result.error || "Failed to save border radius");
      }

      const stored = clampRadius(result.data);
      setSavedRadius(stored);
      setRadius(stored);
      applyRadius(stored);

      showToast({
        type: "success",
        title: t("common.success"),
        message: t("admin.borderRadiusSaved"),
      });
    } catch (error) {
      console.error("Failed to save border radius:", error);
      showToast({
        type: "error",
        title: t("errors.saveError"),
        message:
          error instanceof Error
            ? error.message
            : t("errors.anUnknownErrorOccurred"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    radius,
    isLoading,
    isSaving,
    hasRadiusChanges: radius !== savedRadius,
    handleRadiusChange,
    handleResetRadius,
    handleSaveRadius,
  };
};
