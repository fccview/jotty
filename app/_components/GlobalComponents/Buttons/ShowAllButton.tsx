"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight04Icon } from "hugeicons-react";
import { Button } from "./Button";

interface ShowAllButtonProps {
  href: string;
  label: string;
}

export const ShowAllButton = ({ href, label }: ShowAllButtonProps) => {
  const t = useTranslations();
  const router = useRouter();

  return (
    <Button variant="outline" size="sm" className="ml-2" onClick={() => router.push(href)}>
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{t("common.all")}</span>
      <ArrowRight04Icon className="h-4 w-4 ml-1 sm:ml-2" />
    </Button>
  );
};
