"use client";
import { useState, type JSX } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Category } from "@/app/_types";
import { QuickSettingId, SliderSettingId, QUICK_SETTINGS, accountValueOf } from "@/app/_consts/quick-settings";
import {
  CHECKLIST_FIELDS,
  GENERAL_FIELDS,
  HOME_WIDGET_FIELDS,
  KANBAN_FIELDS,
  NOTE_FIELDS,
  NOTE_LEAD_FIELDS,
} from "@/app/_consts/preference-fields";
import { SETTING_DEFAULTS } from "@/app/_consts/user-settings";
import { usePreferenceSettings } from "@/app/_hooks/settings/usePreferenceSettings";
import { useThemeOptions } from "@/app/_hooks/settings/useThemeOptions";
import { PreferenceSlider } from "./PreferenceSlider";
import { PreferenceSelect } from "./PreferenceSelect";
import { PreferenceFields } from "./PreferenceFields";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { Label } from "@/app/_components/GlobalComponents/FormElements/label";
import { FormWrapper } from "@/app/_components/GlobalComponents/FormElements/FormWrapper";
import { DeleteAccountModal } from "@/app/_components/GlobalComponents/Modals/UserModals/DeleteAccountModal";

interface SettingsTabProps {
  noteCategories: Category[];
  localeOptions: Array<{ id: string, name: JSX.Element }>;
  instanceLocale: string;
  instanceLocaleName: string;
}

const TRANSLATIONS_HOWTO = "https://github.com/fccview/jotty/blob/main/howto/TRANSLATIONS.md";

export const UserPreferencesTab = ({
  noteCategories,
  localeOptions,
  instanceLocale,
  instanceLocaleName,
}: SettingsTabProps) => {
  const t = useTranslations();
  const { isDemoMode, appSettings } = useAppMode();
  const { current, errors, change, slide, commit } = usePreferenceSettings();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const themeOptions = useThemeOptions();

  const sliderProps = (id: SliderSettingId) => {
    const key = QUICK_SETTINGS[id].userKey;
    return {
      settingId: id,
      value: accountValueOf(id, current),
      error: errors[key],
      instanceRadius: appSettings?.borderRadius,
      onChange: (value: number) => slide(id, value),
      onCommit: () => commit(id),
      onDefault: () => change(key, null),
    };
  };

  const fieldProps = { settings: current, errors, onChange: change };

  return (
    <div className="space-y-6">
      <FormWrapper title={t("settings.general")} collapsible>
        <div className="space-y-4">
          <PreferenceSelect
            inputId="preferred-locale"
            label={t("settings.preferredLanguage")}
            description={t("settings.choosePreferredLanguage")}
            placeholder={t("settings.selectLanguage")}
            value={current.preferredLocale}
            defaultValue={instanceLocale}
            defaultLabel={instanceLocaleName}
            options={localeOptions}
            error={errors.preferredLocale}
            onChange={(value) => change("preferredLocale", value === null ? null : String(value))}
            footer={
              <p className="text-md lg:text-xs text-muted-foreground mt-2">
                <a
                  href={TRANSLATIONS_HOWTO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {t("settings.customTranslationsInfo")}
                </a>
              </p>
            }
          />

          {themeOptions ? (
            <PreferenceSelect
              inputId="preferred-theme"
              label={t("settings.preferredTheme")}
              description={t("settings.choosePreferredTheme")}
              placeholder={t("settings.selectTheme")}
              value={current.preferredTheme}
              defaultValue={SETTING_DEFAULTS.preferredTheme}
              options={themeOptions}
              error={errors.preferredTheme}
              onChange={(value) => change("preferredTheme", value === null ? null : String(value))}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="preferred-theme">{t("settings.preferredTheme")}</Label>
              <div className="text-md lg:text-sm text-muted-foreground">{t("settings.loadingThemes")}</div>
            </div>
          )}

          <PreferenceSlider
            {...sliderProps(QuickSettingId.BORDER_RADIUS)}
            inputId="preferred-border-radius"
            label={t("settingsModal.borderRadius")}
            description={t("settings.borderRadiusDescription")}
          />

          <PreferenceFields fields={GENERAL_FIELDS} {...fieldProps} />
        </div>
      </FormWrapper>

      <FormWrapper title={t("settings.notesPreferences")} collapsible defaultOpen={false}>
        <PreferenceFields fields={NOTE_LEAD_FIELDS} {...fieldProps} />

        <PreferenceSlider
          {...sliderProps(QuickSettingId.NOTE_FONT_SIZE)}
          inputId="notes-font-size"
          label={t("settings.notesFontSize")}
          description={t("settings.notesFontSizeDescription")}
        />

        <PreferenceFields fields={NOTE_FIELDS} {...fieldProps} />

        {(current.quickCreateNotes ?? SETTING_DEFAULTS.quickCreateNotes) === "enable" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="quick-create-notes-category">{t("settings.defaultCategory")}</Label>
              {current.quickCreateNotesCategory && (
                <button
                  type="button"
                  onClick={() => change("quickCreateNotesCategory", null)}
                  className="text-md lg:text-xs text-primary hover:underline"
                >
                  {t("settings.default")}
                </button>
              )}
            </div>
            <CategoryTreeSelector
              categories={noteCategories}
              selectedCategory={current.quickCreateNotesCategory || ""}
              onCategorySelect={(value) => change("quickCreateNotesCategory", value || null)}
              placeholder={t("settings.selectDefaultCategory")}
              className="w-full"
            />
            <p className="text-md lg:text-sm text-muted-foreground">
              {t("settings.defaultCategoryDescription")}
            </p>
          </div>
        )}
      </FormWrapper>

      <FormWrapper title={t("settings.checklistsPreferences")} collapsible defaultOpen={false}>
        <PreferenceFields fields={CHECKLIST_FIELDS} {...fieldProps} />
      </FormWrapper>

      <FormWrapper title={t("settings.homeWidgetsSection")} collapsible defaultOpen={false}>
        <PreferenceFields fields={HOME_WIDGET_FIELDS} {...fieldProps} />
      </FormWrapper>

      <FormWrapper title={t("settings.kanbanSection")} collapsible defaultOpen={false}>
        <PreferenceSlider
          {...sliderProps(QuickSettingId.KANBAN_COLUMN_WIDTH)}
          inputId="kanban-column-width"
          label={t("settingsModal.kanbanColumnWidth")}
          description={t("settings.kanbanColumnWidthDescription")}
        />

        <PreferenceFields fields={KANBAN_FIELDS} {...fieldProps} />
      </FormWrapper>

      <FormWrapper title={t("settings.accountManagement")} collapsible defaultOpen={false}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-jotty">
            <div>
              <h4 className="font-medium">{t("settings.deleteAccount")}</h4>
              <p className="text-md lg:text-sm text-muted-foreground">
                {t("settings.deleteAccountDescription")}
              </p>
            </div>
            {isDemoMode ? (
              <span className="text-md lg:text-sm text-muted-foreground">
                {t("settings.disabledInDemoMode")}
              </span>
            ) : (
              <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
                {t("settings.deleteAccount")}
              </Button>
            )}
          </div>
        </div>
      </FormWrapper>

      <DeleteAccountModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} />
    </div>
  );
};
