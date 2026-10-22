"use client";

import { useTranslations } from "next-intl";
import { Checklist } from "@/app/_types";
import { isKanbanType, Modes } from "@/app/_types/enums";
import { useListSummary } from "@/app/_hooks/useListCardStats";
import { useItemSharing } from "@/app/_hooks/useItemSharing";
import { TickGrid } from "@/app/_components/GlobalComponents/Cards/Parts/TickGrid";
import { NextUp } from "@/app/_components/GlobalComponents/Cards/Parts/NextUp";
import { MiniBoard } from "@/app/_components/GlobalComponents/Cards/Parts/MiniBoard";
import { Tally } from "@/app/_components/GlobalComponents/Cards/Parts/Tally";
import { AvatarStack } from "@/app/_components/GlobalComponents/User/AvatarStack";
import { PickUpCard } from "./PickUpCard";

const PEOPLE_LIMIT = 4;

export const ChecklistPickUp = ({ list, onOpen }: { list: Checklist; onOpen: () => void }) => {
  const t = useTranslations();
  const { people } = useItemSharing(list.uuid, Modes.CHECKLISTS);
  const isBoard = isKanbanType(list.type);
  const summary = useListSummary(list);
  const { total, completed } = summary;

  return (
    <PickUpCard
      title={list.title}
      category={list.category}
      updatedAt={list.updatedAt}
      actionLabel={isBoard ? t("browse.openBoard") : t("browse.openList")}
      onOpen={onOpen}
      footer={
        <span className="flex items-center gap-3">
          <Tally done={completed} total={total} />
          <AvatarStack
            usernames={list.sharedFrom ? [list.sharedFrom] : people}
            limit={PEOPLE_LIMIT}
            size="sm"
          />
        </span>
      }
    >
      {isBoard ? (
        <MiniBoard summary={summary} />
      ) : (
        <>
          <TickGrid summary={summary} />
          <div className="mt-3">
            <NextUp uuid={list.uuid} summary={summary} />
          </div>
        </>
      )}
    </PickUpCard>
  );
};
