"use client";

import { ReactNode, useState } from "react";
import { useTranslations } from "next-intl";
import type { PublicLinks } from "@/app/_types/relations";
import { PublicUser } from "@/app/_utils/user-sanitize-utils";
import { cn } from "@/app/_utils/global-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useMediaQuery } from "@/app/_hooks/useMediaQuery";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { AppName } from "@/app/_components/GlobalComponents/Layout/AppName";
import { ReadingProgressBar } from "@/app/_components/GlobalComponents/Layout/ReadingProgressBar";
import { PanelCloseButton, PanelSheet } from "@/app/_components/FeatureComponents/Notes/Parts/NotePanel/NotePanel";
import { PublicPanelBody, publicTabsFor } from "./PublicPanelBody";
import { PublicSheetHeader } from "./PublicSheetHeader";

const RW_MARKABLE = "rwMarkable";
const DOCKS = "(min-width: 1280px)";

interface PublicPaperProps {
  title: string;
  user: PublicUser | null;
  category?: string;
  updatedAt: string;
  footer: string;
  links: PublicLinks;
  hasContents?: boolean;
  wide?: boolean;
  actions?: ReactNode;
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
  actions,
  children,
}: PublicPaperProps) => {
  const t = useTranslations();
  const { isRwMarkable } = useAppMode();
  const canDock = useMediaQuery(DOCKS);
  const [showPanel, setShowPanel] = useState(false);
  const tabs = publicTabsFor(hasContents, links);
  const hasPanel = tabs.length > 0;
  const isDocked = hasPanel && showPanel && canDock;

  return (
    <div className="relative min-h-[100dvh] w-full bg-background px-4 pb-10 pt-7 lg:py-12">
      <div aria-hidden="true" className="jotty-auth-paper no-print pointer-events-none fixed inset-0" />
      <ReadingProgressBar fixed />

      <main
        className={cn(
          "relative mx-auto w-full min-w-0",
          wide ? "max-w-[100rem]" : isDocked ? "max-w-[71.5rem]" : "max-w-3xl",
        )}
      >
        <div className="no-print mb-7 flex items-center justify-center gap-3">
          <DynamicLogo className="h-9 w-9 lg:h-8 lg:w-8" />
          <AppName
            className="jotty-app-name text-2xl font-bold text-foreground lg:text-xl"
            fallback={isRwMarkable ? RW_MARKABLE : undefined}
          />
        </div>

        <div className={cn(isDocked && "grid grid-cols-[minmax(0,1fr)_22rem] items-start gap-6")}>
          <article className="min-w-0 overflow-hidden rounded-jotty border border-border bg-card shadow-[0_24px_48px_-32px_rgb(var(--primary)/0.35)]">
            <div className="h-1 bg-primary/70" />
            <PublicSheetHeader
              user={user}
              category={category}
              updatedAt={updatedAt}
              actions={actions}
              isDetailsOpen={showPanel}
              onToggleDetails={hasPanel ? () => setShowPanel((open) => !open) : undefined}
            />
            <div className="px-5 py-5 lg:px-6">
              <h1 className="mb-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
              {children}
            </div>
          </article>

          {isDocked && (
            <aside
              aria-label={t("notePanel.title")}
              className="no-print sticky top-6 flex max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-jotty border border-border bg-card"
            >
              <PublicPanelBody
                tabs={tabs}
                links={links}
                trailing={<PanelCloseButton onClose={() => setShowPanel(false)} />}
              />
            </aside>
          )}
        </div>

        <p className="no-print mt-8 text-center text-md text-muted-foreground lg:text-sm">{footer}</p>
      </main>

      {hasPanel && showPanel && !canDock && (
        <PanelSheet onClose={() => setShowPanel(false)}>
          <PublicPanelBody tabs={tabs} links={links} />
        </PanelSheet>
      )}
    </div>
  );
};
