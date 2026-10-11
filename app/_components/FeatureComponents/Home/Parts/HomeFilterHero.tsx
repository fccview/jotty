"use client";

import { useTranslations } from "next-intl";
import { Cancel01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { FeedFilter } from "@/app/_hooks/useFilteredFeed";
import { HomeHero } from "./HomeHero";
import { QuickCapture } from "./QuickCapture";

interface HomeFilterHeroProps {
  filter: FeedFilter;
  name: string;
  promptsKey: string;
  createLabel: string;
  onCapture: (title: string) => void;
  onClear: () => void;
}

export const HomeFilterHero = ({
  filter,
  name,
  promptsKey,
  createLabel,
  onCapture,
  onClear,
}: HomeFilterHeroProps) => {
  const t = useTranslations();

  return (
    <HomeHero
      kicker={filter.type === "category" ? t("common.category") : t("browse.tag")}
      title={filter.type === "tag" ? `#${name}` : name}
    >
      <div className="flex flex-col gap-3">
        {filter.type === "category" && (
          <QuickCapture
            promptsKey={promptsKey}
            buttonLabel={createLabel}
            onCapture={onCapture}
          />
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="self-start gap-2 text-primary-foreground hover:bg-primary-foreground/[0.15] hover:text-primary-foreground"
        >
          <Cancel01Icon className="h-4 w-4" />
          {t("browse.clearFilter")}
        </Button>
      </div>
    </HomeHero>
  );
};
