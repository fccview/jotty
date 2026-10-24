"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { AppName } from "@/app/_components/GlobalComponents/Layout/AppName";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { KICKER_CLASS } from "@/app/_consts/styling";
import { cn } from "@/app/_utils/global-utils";

const RELEASES_URL = "https://github.com/fccview/jotty/releases/tag";
const RW_MARKABLE = "rwMarkable";
const TITLE_ID = "jotty-auth-title";

interface AuthShellProps {
  kicker: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}

export const AuthShell = ({ kicker, title, description, badge, children }: AuthShellProps) => {
  const t = useTranslations("auth");
  const { appVersion, isRwMarkable } = useAppMode();

  return (
    <div className="jotty-auth-wrapper relative flex min-h-[100dvh] w-full items-start justify-center bg-background px-4 pb-10 pt-7 lg:items-center lg:py-14">
      <div aria-hidden="true" className="jotty-auth-paper pointer-events-none fixed inset-0" />
      <div className="relative w-full max-w-[420px]">
        <div className="mb-7 flex items-center justify-center gap-3">
          <DynamicLogo className="h-9 w-9 lg:h-8 lg:w-8" />
          <AppName
            className="jotty-app-name text-2xl font-bold text-foreground lg:text-xl"
            fallback={isRwMarkable ? RW_MARKABLE : undefined}
          />
        </div>

        <section
          aria-labelledby={TITLE_ID}
          className="jotty-auth-card overflow-hidden rounded-jotty border border-border bg-card shadow-[0_24px_48px_-32px_rgb(var(--primary)/0.35)]"
        >
          <div className="h-1 bg-primary/70" />

          <header className="border-b border-dashed border-border px-5 py-4 lg:px-6">
            <div className={cn(KICKER_CLASS, "mb-1.5 flex items-center gap-2")}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {kicker}
              {badge && (
                <span className="rounded-jotty border border-primary/40 bg-primary/5 px-1.5 py-px text-primary">
                  {badge}
                </span>
              )}
            </div>
            <h1 id={TITLE_ID} className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-md leading-relaxed text-muted-foreground lg:text-sm">
                {description}
              </p>
            )}
          </header>

          <div className="space-y-4 px-5 py-5 lg:px-6">{children}</div>

          {appVersion && (
            <footer className={cn(KICKER_CLASS, "flex justify-end border-t border-dashed border-border px-5 py-3 lg:px-6")}>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`${RELEASES_URL}/${appVersion}`}
                className="transition-colors hover:text-foreground"
              >
                {t("version", { version: appVersion })}
              </a>
            </footer>
          )}
        </section>
      </div>
    </div>
  );
};
