"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight01Icon } from "hugeicons-react";
import {
  QUICK_TABS,
  QuickSettingId,
  QuickTab,
  accountValueOf,
  quickSettingsFor,
} from "@/app/_consts/quick-settings";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useSettings } from "@/app/_utils/settings-store";
import { useThemeOptions } from "@/app/_hooks/settings/useThemeOptions";
import { cn } from "@/app/_utils/global-utils";
import { KICKER_CLASS } from "@/app/_consts/styling";
import { Modal, ModalVariant } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { QuickSettingRow } from "./Parts/QuickSettingRow";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTION_LABELS: Record<QuickTab, string> = {
  [QuickTab.APPEARANCE]: "settings.appearance",
  [QuickTab.NOTES]: "notes.title",
  [QuickTab.LISTS]: "checklists.lists",
};

const PanelKicker = () => {
  const t = useTranslations();
  const { user } = useAppMode();
  const overrides = useSettings((state) => state.overrides);
  const overrideCount = (Object.keys(overrides) as QuickSettingId[]).filter(
    (id) => overrides[id] !== accountValueOf(id, user),
  ).length;

  return (
    <>
      <span className={KICKER_CLASS}>{t("quickSettings.title")}</span>
      <span
        className={cn(KICKER_CLASS, "text-primary transition-opacity duration-200", overrideCount ? "opacity-100" : "opacity-0")}
        aria-live="polite"
      >
        {overrideCount > 0 && `· ${t("quickSettings.overrideCount", { count: overrideCount })}`}
      </span>
    </>
  );
};

const PanelFooter = ({ close }: { close: () => void }) => {
  const t = useTranslations();

  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        href="/settings/user-preferences"
        onClick={close}
        className="group inline-flex items-center gap-1 text-md lg:text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        {t("quickSettings.allPreferences")}
        <ArrowRight01Icon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
      <Button size="sm" onClick={close}>
        {t("common.done")}
      </Button>
    </div>
  );
};

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const t = useTranslations();
  const themes = useThemeOptions(isOpen);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("quickSettings.heading")}
      kicker={<PanelKicker />}
      description={t("quickSettings.subtitle")}
      footer={(close) => <PanelFooter close={close} />}
      variant={ModalVariant.PANEL}
      flush
    >
      {QUICK_TABS.map((section, index) => (
        <section
          key={section}
          aria-labelledby={`quick-section-${section}`}
          className={cn("jotty-quick-settings-section py-2", index > 0 && "border-t border-dashed border-border")}
        >
          <h3 id={`quick-section-${section}`} className={cn(KICKER_CLASS, "px-6 pt-3 pb-1")}>
            {t(SECTION_LABELS[section])}
          </h3>
          {quickSettingsFor(section).map((id) => (
            <QuickSettingRow key={id} id={id} themes={themes} />
          ))}
        </section>
      ))}
    </Modal>
  );
};
