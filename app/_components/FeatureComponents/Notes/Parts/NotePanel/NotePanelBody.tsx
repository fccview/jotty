"use client";

import { ReactNode, useMemo } from "react";
import { NotePanelTabs } from "@/app/_consts/notes";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useRelations } from "@/app/_providers/RelationsProvider";
import { useNotesStore } from "@/app/_utils/notes-store";
import { tagSources } from "@/app/_utils/tag-utils";
import { TableOfContents } from "@/app/_components/FeatureComponents/Notes/Parts/TableOfContents";
import { PanelTabs } from "./PanelTabs";
import { NoteTags } from "./NoteTags";
import { NoteLinks } from "./NoteLinks";

export interface NotePanelBodyProps {
  content: string;
  savedContent: string;
  isEditing: boolean;
  frontmatterTags?: string[];
  onEditFrontmatter?: () => void;
}

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

  const counts = {
    [NotePanelTabs.TAGS]: sources.length,
    [NotePanelTabs.LINKS]: backlinks.length + mentions.length,
  };

  return (
    <>
      <PanelTabs tabs={tabs} active={active} counts={counts} onSelect={setPanelTab} trailing={trailing} />
      <div role="tabpanel" className="flex-1 overflow-y-auto hide-scrollbar p-2">
        {active === NotePanelTabs.CONTENTS && <TableOfContents content={content} isEditing={isEditing} />}
        {active === NotePanelTabs.TAGS && <NoteTags sources={sources} onEditFrontmatter={onEditFrontmatter} />}
        {active === NotePanelTabs.LINKS && <NoteLinks />}
      </div>
    </>
  );
};
