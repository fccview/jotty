"use client";

import { ComponentType } from "react";
import { useTranslations } from "next-intl";
import {
  CheckmarkSquare04Icon,
  DashboardSquare01Icon,
  File02Icon,
  FloppyDiskIcon,
  Layout3ColumnIcon,
  PaintBoardIcon,
  SidebarRightIcon,
  SmileIcon,
  SquareIcon,
  TextAlignLeftIcon,
  TextFontIcon,
} from "hugeicons-react";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useQuickSetting } from "@/app/_hooks/settings/useQuickSetting";
import {
  QUICK_SETTINGS,
  QuickSettingId,
  SliderSettingId,
  ToggleSettingId,
  isSliderSetting,
  isToggleSetting,
  sliderOf,
} from "@/app/_consts/quick-settings";
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";
import { ViewModeSwitch } from "@/app/_components/GlobalComponents/Buttons/ViewModeSwitch";
import { SettingSlider } from "@/app/_components/FeatureComponents/Settings/Parts/SettingSlider";
import { Dropdown, DropdownOption } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { OverrideState, QuickRow } from "./QuickRow";

const ICONS: Record<QuickSettingId, ComponentType<{ className?: string }>> = {
  [QuickSettingId.THEME]: PaintBoardIcon,
  [QuickSettingId.BORDER_RADIUS]: SquareIcon,
  [QuickSettingId.NOTE_FONT_SIZE]: TextFontIcon,
  [QuickSettingId.KANBAN_COLUMN_WIDTH]: Layout3ColumnIcon,
  [QuickSettingId.VIEW_MODE]: DashboardSquare01Icon,
  [QuickSettingId.CARD_PREVIEW]: File02Icon,
  [QuickSettingId.COMPACT_MODE]: TextAlignLeftIcon,
  [QuickSettingId.DETAILS_PANEL]: SidebarRightIcon,
  [QuickSettingId.AUTOSAVE]: FloppyDiskIcon,
  [QuickSettingId.SHOW_EMOJIS]: SmileIcon,
  [QuickSettingId.COMPLETED_SUGGESTIONS]: CheckmarkSquare04Icon,
};

const HINTS: Partial<Record<QuickSettingId, string>> = {
  [QuickSettingId.BORDER_RADIUS]: "quickSettings.hints.borderRadius",
  [QuickSettingId.NOTE_FONT_SIZE]: "quickSettings.hints.noteFontSize",
  [QuickSettingId.KANBAN_COLUMN_WIDTH]: "quickSettings.hints.kanbanColumnWidth",
  [QuickSettingId.CARD_PREVIEW]: "quickSettings.hints.cardPreview",
  [QuickSettingId.COMPACT_MODE]: "quickSettings.hints.compactMode",
  [QuickSettingId.DETAILS_PANEL]: "quickSettings.hints.detailsPanel",
};

const controlIdOf = (id: QuickSettingId) => `quick-setting-${id}`;

const useRowBasics = <K extends QuickSettingId>(id: K) => {
  const t = useTranslations();
  const setting = useQuickSetting(id);
  const hintKey: string | undefined = HINTS[id];
  const override: OverrideState = {
    isOverridden: setting.isOverridden,
    canSave: setting.value !== setting.accountValue,
    isSaving: setting.isSaving,
    onReset: setting.reset,
    onSave: setting.saveToAccount,
  };

  return {
    t,
    setting,
    override,
    row: {
      controlId: controlIdOf(id),
      icon: ICONS[id],
      label: t(QUICK_SETTINGS[id].labelKey),
      hint: hintKey ? t(hintKey) : undefined,
    },
  };
};

const SliderRow = ({ id }: { id: SliderSettingId }) => {
  const { appSettings } = useAppMode();
  const { t, setting, override, row } = useRowBasics(id);
  const control = sliderOf(id);
  if (!control) return null;
  const instanceRadius = appSettings?.borderRadius;
  const shown = setting.value ?? control.fallback(instanceRadius);

  return (
    <QuickRow
      {...row}
      {...override}
      value={control.valueText(setting.value, shown, t)}
      below={
        <SettingSlider
          id={row.controlId}
          label={row.label}
          control={control}
          value={setting.value}
          instanceRadius={instanceRadius}
          onChange={setting.set}
          showValue={false}
        />
      }
    />
  );
};

const ToggleRow = ({ id }: { id: ToggleSettingId }) => {
  const { setting, override, row } = useRowBasics(id);

  return (
    <QuickRow
      {...row}
      {...override}
      inline={<Toggle id={row.controlId} checked={setting.value} onCheckedChange={setting.set} />}
    />
  );
};

const ThemeRow = ({ themes }: { themes: DropdownOption[] | null }) => {
  const { t, setting, override, row } = useRowBasics(QuickSettingId.THEME);

  return (
    <QuickRow
      {...row}
      {...override}
      below={
        themes ? (
          <Dropdown
            id={row.controlId}
            value={setting.value}
            options={themes}
            onChange={setting.set}
            className="w-full"
          />
        ) : (
          <div className="h-10 rounded-jotty bg-muted/60 animate-pulse" aria-label={t("settings.loadingThemes")} />
        )
      }
    />
  );
};

const ViewModeRow = () => {
  const { override, row } = useRowBasics(QuickSettingId.VIEW_MODE);

  return <QuickRow {...row} {...override} below={<ViewModeSwitch id={row.controlId} isWide />} />;
};

interface QuickSettingRowProps {
  id: QuickSettingId;
  themes: DropdownOption[] | null;
}

export const QuickSettingRow = ({ id, themes }: QuickSettingRowProps) => {
  if (id === QuickSettingId.THEME) return <ThemeRow themes={themes} />;
  if (id === QuickSettingId.VIEW_MODE) return <ViewModeRow />;
  if (isSliderSetting(id)) return <SliderRow id={id} />;
  if (isToggleSetting(id)) return <ToggleRow id={id} />;
  return null;
};
