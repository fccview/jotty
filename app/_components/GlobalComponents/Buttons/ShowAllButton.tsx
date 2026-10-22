"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight04Icon } from "hugeicons-react";
import { buttonVariants } from "./Button";

interface ShowAllButtonProps {
  href: string;
  label: string;
}

export const ShowAllButton = ({ href, label }: ShowAllButtonProps) => {
  const t = useTranslations();

  return (
    <Link
      href={href}
      className={buttonVariants({ variant: "outline", size: "sm", className: "ml-2" })}
    >
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{t("common.all")}</span>
      <ArrowRight04Icon className="h-4 w-4 ml-1 sm:ml-2" />
    </Link>
  );
};
