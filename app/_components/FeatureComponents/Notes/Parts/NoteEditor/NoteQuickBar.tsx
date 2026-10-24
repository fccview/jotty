"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useBottomBarSpace } from "@/app/_hooks/useBottomBarSpace";
import { BottomBarSpaces } from "@/app/_types/enums";
import { cn } from "@/app/_utils/global-utils";

export enum QuickBarSlots {
  MODES = "modes",
  ACTIONS = "actions",
}

type SlotTargets = Record<QuickBarSlots, HTMLElement | null>;

const QuickBarContext = createContext<SlotTargets | null>(null);

export const quickBarButton = "h-10 w-auto min-w-0 max-w-[3rem] flex-1 px-0";

interface NoteQuickBarProps {
  active: boolean;
  children: ReactNode;
}

export const NoteQuickBar = ({ active, children }: NoteQuickBarProps) => {
  const t = useTranslations();
  const { user } = useAppMode();
  const barRef = useRef<HTMLDivElement>(null);
  const [modes, setModes] = useState<HTMLElement | null>(null);
  const [actions, setActions] = useState<HTMLElement | null>(null);

  useBottomBarSpace(barRef, BottomBarSpaces.NOTE_BAR, { enabled: active });

  return (
    <QuickBarContext.Provider value={active ? { modes, actions } : null}>
      {children}
      {active && (
        <div
          ref={barRef}
          role="toolbar"
          aria-label={t("editor.quickControls")}
          className={cn(
            "jotty-note-quick-bar fixed inset-x-0 bottom-0 z-40 lg:hidden no-print",
            "flex items-center gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
            "bg-background border-t border-border",
            user?.handedness === "left-handed" && "flex-row-reverse",
          )}
        >
          <div ref={setModes} className="contents" />
          <div className="flex-1 min-w-0" />
          <div ref={setActions} className="contents" />
        </div>
      )}
    </QuickBarContext.Provider>
  );
};

interface QuickBarPortalProps {
  slot: QuickBarSlots;
  children: ReactNode;
  fallbackClassName?: string;
}

export const QuickBarPortal = ({
  slot,
  children,
  fallbackClassName,
}: QuickBarPortalProps) => {
  const targets = useContext(QuickBarContext);

  if (!targets) {
    return fallbackClassName ? (
      <div className={cn(fallbackClassName, "[&>button]:w-10 [&>button]:flex-none")}>
        {children}
      </div>
    ) : null;
  }

  const target = targets[slot];
  return target ? createPortal(children, target) : null;
};
