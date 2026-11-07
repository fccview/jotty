"use client";

import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { NotePanelTabs } from "@/app/_consts/notes";
import type { PublicLinks } from "@/app/_types/relations";
import {
  PANEL_TAB_ICONS,
  PANEL_TAB_LABELS,
} from "@/app/_components/FeatureComponents/Notes/Parts/NotePanel/NotePanelBody";
import { PanelCloseButton } from "@/app/_components/FeatureComponents/Notes/Parts/NotePanel/NotePanel";
import { PublicPanelBody } from "./PublicPanelBody";

interface PublicRailProps {
  tabs: NotePanelTabs[];
  links: PublicLinks;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export const PublicRail = ({ tabs, links, isOpen, onToggle }: PublicRailProps) => {
  const t = useTranslations();
  const [first] = tabs;

  return (
    <nav aria-label={t("notePanel.title")} className="no-print hidden lg:block">
      <div className="sticky top-12 flex max-h-[calc(100dvh-6rem)] flex-col">
        {isOpen ? (
          <div className="flex min-h-0 flex-col rounded-jotty bg-background/80 backdrop-blur-sm">
            <PublicPanelBody tabs={tabs} links={links} trailing={<PanelCloseButton onClose={() => onToggle(false)} />} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onToggle(true)}
            aria-expanded={false}
            className="flex items-center gap-1.5 self-start rounded-[calc(var(--jotty-radius-effective)*0.75)] border border-border bg-background/80 px-2.5 py-1.5 text-sm text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground"
          >
            <HugeiconsIcon icon={PANEL_TAB_ICONS[first]} className="h-4 w-4" />
            {t(PANEL_TAB_LABELS[first])}
          </button>
        )}
      </div>
    </nav>
  );
};
