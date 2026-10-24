"use client";

import { ReactNode, useMemo } from "react";
import { useTranslations } from "next-intl";
import { LeftToRightListBulletIcon, Link04Icon, Tag01Icon } from "@hugeicons/core-free-icons";
import { NotePanelTabs } from "@/app/_consts/notes";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useRelations } from "@/app/_providers/RelationsProvider";
import { useNotesStore } from "@/app/_utils/notes-store";
import { tagSources } from "@/app/_utils/tag-utils";
import { TableOfContents } from "@/app/_components/FeatureComponents/Notes/Parts/TableOfContents";
import { PanelTabs } from "@/app/_components/GlobalComponents/Tabs/PanelTabs";
import { NoteTags } from "./NoteTags";
import { NoteLinks } from "./NoteLinks";

export interface NotePanelBodyProps {
  content: string;
  savedContent: string;
  isEditing: boolean;
  frontmatterTags?: string[];
  onEditFrontmatter?: () => void;
}

const TAB_ICONS = {
  [NotePanelTabs.CONTENTS]: LeftToRightListBulletIcon,
  [NotePanelTabs.TAGS]: Tag01Icon,
  [NotePanelTabs.LINKS]: Link04Icon,
};

const TAB_LABELS = {
  [NotePanelTabs.CONTENTS]: "notes.contents",
  [NotePanelTabs.TAGS]: "notes.tags",
  [NotePanelTabs.LINKS]: "notePanel.links",
};

interface BodyLayout {
  trailing?: ReactNode;
}

export const NotePanelBody = ({
  content,
  savedContent,
  isEditing,
  frontmatterTags,
  onEditFrontmatter,
  trailing,
}: NotePanelBodyProps & BodyLayout) => {
  const t = useTranslations();
  const { appSettings } = useAppMode();
  const { backlinks, mentions } = useRelations();
  const { panelTab, setPanelTab } = useNotesStore();

  const linksOn = appSettings?.editor?.enableBilateralLinks !== false;
  const tabs = linksOn
    ? [NotePanelTabs.CONTENTS, NotePanelTabs.TAGS, NotePanelTabs.LINKS]
    : [NotePanelTabs.CONTENTS, NotePanelTabs.TAGS];
  const active = tabs.includes(panelTab) ? panelTab : NotePanelTabs.CONTENTS;

  const sources = useMemo(
    () => tagSources(frontmatterTags, content, savedContent),
    [frontmatterTags, content, savedContent],
  );

  const counts: Partial<Record<NotePanelTabs, number>> = {
    [NotePanelTabs.TAGS]: sources.length,
    [NotePanelTabs.LINKS]: backlinks.length + mentions.length,
  };

  const panelTabs = tabs.map((id) => ({
    id,
    icon: TAB_ICONS[id],
    label: t(TAB_LABELS[id]),
    count: counts[id],
  }));

  return (
    <>
      <PanelTabs tabs={panelTabs} active={active} onSelect={setPanelTab} trailing={trailing} />
      <div role="tabpanel" className="flex-1 overflow-y-auto hide-scrollbar p-2">
        {active === NotePanelTabs.CONTENTS && <TableOfContents content={content} isEditing={isEditing} />}
        {active === NotePanelTabs.TAGS && <NoteTags sources={sources} onEditFrontmatter={onEditFrontmatter} />}
        {active === NotePanelTabs.LINKS && <NoteLinks />}
      </div>
    </>
  );
};
