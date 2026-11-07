"use client";

import { ReactNode, useState } from "react";
import { useTranslations } from "next-intl";
import { NotePanelTabs } from "@/app/_consts/notes";
import type { PublicLinks } from "@/app/_types/relations";
import { PanelTabs } from "@/app/_components/GlobalComponents/Tabs/PanelTabs";
import { TableOfContents } from "@/app/_components/FeatureComponents/Notes/Parts/TableOfContents";
import {
  PANEL_TAB_ICONS,
  PANEL_TAB_LABELS,
} from "@/app/_components/FeatureComponents/Notes/Parts/NotePanel/NotePanelBody";
import { PublicLinkList } from "./PublicLinkList";

interface PublicPanelBodyProps {
  links: PublicLinks;
  trailing?: ReactNode;
}

export const PublicPanelBody = ({ links, trailing }: PublicPanelBodyProps) => {
  const t = useTranslations();
  const [tab, setTab] = useState(NotePanelTabs.CONTENTS);

  const linkCount = links.backlinks.length + links.links.length;
  const tabs = linkCount > 0 ? [NotePanelTabs.CONTENTS, NotePanelTabs.LINKS] : [NotePanelTabs.CONTENTS];
  const active = tabs.includes(tab) ? tab : NotePanelTabs.CONTENTS;

  const panelTabs = tabs.map((id) => ({
    id,
    icon: PANEL_TAB_ICONS[id],
    label: t(PANEL_TAB_LABELS[id]),
    count: id === NotePanelTabs.LINKS ? linkCount : undefined,
  }));

  return (
    <>
      <PanelTabs tabs={panelTabs} active={active} onSelect={setTab} trailing={trailing} />
      <div role="tabpanel" className="flex-1 overflow-y-auto hide-scrollbar p-2">
        {active === NotePanelTabs.CONTENTS && <TableOfContents />}
        {active === NotePanelTabs.LINKS && <PublicLinkList links={links} />}
      </div>
    </>
  );
};
