"use client";

import { ComponentType } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";

interface FilteredEmptyProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClear: () => void;
}

export const FilteredEmpty = ({ icon: Icon, title, description, onClear }: FilteredEmptyProps) => {
  const t = useTranslations();

  return (
    <div className="rounded-jotty border border-dashed border-border px-6 py-14 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
      <div className="mt-5 flex justify-center">
        <Button variant="outline" size="sm" onClick={onClear}>
          {t("common.clear")}
        </Button>
      </div>
    </div>
  );
};
