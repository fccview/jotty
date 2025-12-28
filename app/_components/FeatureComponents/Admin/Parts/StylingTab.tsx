"use client";

import { CssEditor } from "@/app/_components/GlobalComponents/FormElements/CSSEditor";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import {
  Orbit01Icon,
  Add01Icon,
  PencilEdit02Icon,
  Delete03Icon,
} from "hugeicons-react";
import { useStyling } from "@/app/_hooks/useStyling";
import { ThemePreview } from "@/app/_components/FeatureComponents/Admin/Parts/ThemePreview";
import { EmojiManager } from "@/app/_components/FeatureComponents/Admin/Parts/EmojiManager";
import { FormWrapper } from "@/app/_components/GlobalComponents/FormElements/FormWrapper";
import { DynamicIcon } from "@/app/_components/GlobalComponents/Icons/DynamicIcon";
import { useState } from "react";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { useTranslations } from "next-intl";

export const StylingTab = () => {
  const t = useTranslations();
  const {
    css,
    isLoadingCss,
    isSavingCss,
    hasCssChanges,
    handleCssChange,
    handleSaveCss,
    isLoadingThemes,
    isSavingThemes,
    themeModalOpen,
    setThemeModalOpen,
    editingTheme,
    themeForm,
    handleCreateTheme,
    handleEditTheme,
    handleDeleteTheme,
    handleSaveTheme,
    handleThemeFormChange,
    getCustomThemes,
  } = useStyling();

  const [focusedColor, setFocusedColor] = useState<string | null>(null);

  const handleColorFocus = (colorKey: string) => {
    setFocusedColor(colorKey);
  };

  const handleColorBlur = () => {
    setFocusedColor(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card">
        <div className="space-y-6">
          <FormWrapper
            title={t("admin.customCSS")}
            action={
              <Button
                onClick={handleSaveCss}
                disabled={isSavingCss || !hasCssChanges || isLoadingCss}
                size="sm"
              >
                {isSavingCss ? <></> : t("admin.saveCSS")}
              </Button>
            }
          >
            <div className="w-full max-h-[600px] overflow-auto">
              {isLoadingCss ? (
                <div className="flex items-center justify-center p-8">
                  <Logo className="h-6 w-6 animate-pulse" />
                </div>
              ) : (
                <CssEditor value={css} onChange={handleCssChange} />
              )}
            </div>
            {hasCssChanges && (
              <p className="text-xs text-muted-foreground">
                {t("admin.unsavedCssChanges")}
              </p>
            )}
          </FormWrapper>

          <FormWrapper
            title={t("admin.customThemes")}
            action={
              <Button
                onClick={handleCreateTheme}
                disabled={isLoadingThemes}
                size="sm"
              >
                <Add01Icon className="mr-2 h-3 w-3" />
                {t("admin.createTheme")}
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {getCustomThemes().map((theme) => (
                <div
                  key={theme.id}
                  className="flex items-center justify-between p-3 border border-border rounded-jotty bg-muted/30"
                >
                  <div className="flex items-center space-x-2">
                    <theme.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{theme.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTheme(theme.id)}
                      className="h-6 w-6 p-0"
                    >
                      <PencilEdit02Icon className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTheme(theme.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Delete03Icon className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {getCustomThemes().length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                  {t("admin.noCustomThemesYet")}
                </p>
              )}
            </div>
          </FormWrapper>

          <EmojiManager />
        </div>
      </div>

      <Modal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        title={editingTheme ? t("admin.editTheme") : t("admin.createTheme")}
        className="!w-full lg:!max-w-[90vw] !h-[90vh] overflow-y-auto !max-h-[900px]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <Input
                id="themeName"
                label={t("admin.themeName")}
                type="text"
                defaultValue={themeForm.name}
                onChange={(e) => handleThemeFormChange("name", e.target.value)}
                placeholder={t("admin.myCustomTheme")}
              />

              <div className="space-y-2">
                <label htmlFor="themeIcon" className="text-sm font-medium">
                  {t("admin.iconName")}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                    <DynamicIcon
                      iconName={themeForm.icon}
                      className="h-4 w-4 text-muted-foreground"
                    />
                  </div>
                  <Input
                    id="themeIcon"
                    type="text"
                    defaultValue={themeForm.icon}
                    onChange={(e) =>
                      handleThemeFormChange("icon", e.target.value)
                    }
                    placeholder="PaintBrush04Icon"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  <a
                    className="text-primary hover:text-primary/80 underline"
                    href="https://hugeicons.com/icons?style=Stroke&type=Rounded"
                    target="_blank"
                  >
                    Hugeicons
                  </a>{" "}
                  {t("admin.iconNameDescription")}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">{t("admin.colorVariables")}</h4>
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                {Object.entries(themeForm.colors).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center space-x-2 flex-wrap"
                  >
                    <label className="text-xs font-mono text-muted-foreground min-w-0 flex-1">
                      {key}
                    </label>
                    <input
                      type="color"
                      value={
                        value
                          ? `#${value
                            .split(" ")
                            .map((v) => {
                              const num = parseInt(v);
                              return num.toString(16).padStart(2, "0");
                            })
                            .join("")}`
                          : t("editor.colorPlaceholder")
                      }
                      onChange={(e) => {
                        const hex = e.target.value;
                        const r = parseInt(hex.substring(1, 3), 16);
                        const g = parseInt(hex.substring(3, 5), 16);
                        const b = parseInt(hex.substring(5, 7), 16);
                        const rgbValue = `${r} ${g} ${b}`;
                        handleThemeFormChange(key, rgbValue);
                      }}
                      onFocus={() => handleColorFocus(key)}
                      onBlur={handleColorBlur}
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                    <Input
                      id={key}
                      type="text"
                      defaultValue={value}
                      onChange={(e) =>
                        handleThemeFormChange(key, e.target.value)
                      }
                      onFocus={() => handleColorFocus(key)}
                      onBlur={handleColorBlur}
                      placeholder="255 255 255"
                      className="flex-1 text-xs font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setThemeModalOpen(false)}
                disabled={isSavingThemes}
              >{t('common.cancel')}</Button>
              <Button onClick={handleSaveTheme} disabled={isSavingThemes}>
                {isSavingThemes ? (
                  <>
                    <Orbit01Icon className="mr-2 h-4 w-4 animate-spin" />{t('common.saving')}</>
                ) : editingTheme ? (
                  t("admin.updateTheme")
                ) : (
                  t("admin.createTheme")
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">{t("admin.livePreview")}</h4>
            <div className="border border-border rounded-jotty">
              <ThemePreview
                colors={themeForm.colors}
                focusedColor={focusedColor}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
