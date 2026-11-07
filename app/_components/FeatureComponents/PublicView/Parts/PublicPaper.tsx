"use client";

import { ReactNode, useState } from "react";
import type { PublicLinks } from "@/app/_types/relations";
import { PublicUser } from "@/app/_utils/user-sanitize-utils";
import { cn } from "@/app/_utils/global-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { AppName } from "@/app/_components/GlobalComponents/Layout/AppName";
import { ReadingProgressBar } from "@/app/_components/GlobalComponents/Layout/ReadingProgressBar";
import { PanelSheet } from "@/app/_components/FeatureComponents/Notes/Parts/NotePanel/NotePanel";
import { PublicPanelBody, publicTabsFor } from "./PublicPanelBody";
import { PublicRail } from "./PublicRail";
import { PublicSheetHeader } from "./PublicSheetHeader";

const RW_MARKABLE = "rwMarkable";

interface PublicPaperProps {
  title: string;
  user: PublicUser | null;
  category?: string;
  updatedAt: string;
  footer: string;
  links: PublicLinks;
  hasContents?: boolean;
  wide?: boolean;
  children: ReactNode;
}

export const PublicPaper = ({
  title,
  user,
  category,
  updatedAt,
  footer,
  links,
  hasContents = false,
  wide = false,
  children,
}: PublicPaperProps) => {
  const { isRwMarkable } = useAppMode();
  const [showRail, setShowRail] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const tabs = publicTabsFor(hasContents, links);
  const hasPanel = tabs.length > 0;

  return (
    <div className="relative min-h-[100dvh] w-full bg-background px-4 pb-10 pt-7 lg:py-12">
      <div aria-hidden="true" className="jotty-auth-paper no-print pointer-events-none fixed inset-0" />
      <ReadingProgressBar fixed />

      <div
        className={cn(
          "relative mx-auto grid gap-8",
          wide ? "max-w-[100rem]" : "max-w-[86rem]",
          hasPanel && (wide ? "lg:grid-cols-[14rem_minmax(0,1fr)]" : "lg:grid-cols-[14rem_minmax(0,1fr)_14rem]"),
        )}
      >
        {hasPanel && <PublicRail tabs={tabs} links={links} isOpen={showRail} onToggle={setShowRail} />}

        <main className={cn("mx-auto w-full min-w-0", !wide && "max-w-3xl")}>
          <div className="no-print mb-7 flex items-center justify-center gap-3">
            <DynamicLogo className="h-9 w-9 lg:h-8 lg:w-8" />
            <AppName
              className="jotty-app-name text-2xl font-bold text-foreground lg:text-xl"
              fallback={isRwMarkable ? RW_MARKABLE : undefined}
            />
          </div>

          <article className="overflow-hidden rounded-jotty border border-border bg-card shadow-[0_24px_48px_-32px_rgb(var(--primary)/0.35)]">
            <div className="h-1 bg-primary/70" />
            <PublicSheetHeader
              user={user}
              category={category}
              updatedAt={updatedAt}
              onOpenDetails={hasPanel ? () => setShowSheet(true) : undefined}
            />
            <div className="px-5 py-5 lg:px-6">
              <h1 className="mb-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
              {children}
            </div>
          </article>

          <p className="no-print mt-8 text-center text-md text-muted-foreground lg:text-sm">{footer}</p>
        </main>
      </div>

      {showSheet && (
        <PanelSheet onClose={() => setShowSheet(false)}>
          <PublicPanelBody tabs={tabs} links={links} />
        </PanelSheet>
      )}
    </div>
  );
};
