"use client";

import { useTranslations } from "next-intl";
import { Checklist } from "@/app/_types";
import type { PublicLinks } from "@/app/_types/relations";
import { isKanbanType } from "@/app/_types/enums";
import { PublicUser } from "@/app/_utils/user-sanitize-utils";
import { ChecklistProgress } from "@/app/_components/FeatureComponents/Checklists/Parts/Simple/ChecklistProgress";
import { PublicChecklistBody } from "@/app/_components/FeatureComponents/PublicView/Parts/PublicChecklistBody";
import { PublicBoard } from "./Parts/PublicBoard";
import { PublicPaper } from "./Parts/PublicPaper";

interface PublicChecklistViewProps {
  checklist: Checklist;
  user: PublicUser | null;
  links: PublicLinks;
  ownerShowsEmojis: boolean;
}

export const PublicChecklistView = ({ checklist, user, links, ownerShowsEmojis }: PublicChecklistViewProps) => {
  const t = useTranslations();
  const isBoard = isKanbanType(checklist.type);
  const hasItems = checklist.items.length > 0;

  return (
    <PublicPaper
      title={checklist.title}
      user={user}
      category={checklist.category}
      updatedAt={checklist.updatedAt}
      footer={t("checklists.sharedPubliclyBy", { owner: checklist.owner ?? "" })}
      links={links}
      wide={isBoard && hasItems}
    >
      {hasItems && (
        <div className="mb-4">
          <ChecklistProgress checklist={checklist} />
        </div>
      )}
      {isBoard && hasItems ? (
        <PublicBoard checklist={checklist} />
      ) : (
        <PublicChecklistBody checklist={checklist} ownerShowsEmojis={ownerShowsEmojis} />
      )}
    </PublicPaper>
  );
};
