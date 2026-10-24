"use client";

import { ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  MaximizeScreenIcon,
  MinimizeScreenIcon,
  MultiplicationSignIcon,
} from "hugeicons-react";
import { Button } from "../Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { readModalEnlarged, writeModalEnlarged } from "@/app/_utils/modal-store";
import { EXIT_CLASS_ATTR, ghostOut } from "@/app/_utils/modal/modal-ghost";
import { lastFocusOutside, restoreFocus, trackFocus } from "@/app/_utils/modal/focus-history";

export enum ModalVariant {
  DIALOG = "dialog",
  PANEL = "panel",
  WORKSPACE = "workspace",
}

export enum ModalWidth {
  NARROW = "narrow",
  DEFAULT = "default",
  WIDE = "wide",
  XWIDE = "xwide",
  FULL = "full",
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  kicker?: ReactNode;
  description?: ReactNode;
  footer?: (close: () => void) => ReactNode;
  className?: string;
  variant?: ModalVariant;
  width?: ModalWidth;
  flush?: boolean;
  allowEnlarge?: boolean;
  defaultEnlarged?: boolean;
  storageKey?: string;
  closeOnEscape?: boolean;
}

const PORTAL_ID = "modal-portal-root";
const SLIDE_MS = 320;
const MOTION = "duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const WIDTHS: Record<ModalWidth, string> = {
  [ModalWidth.NARROW]: "lg:w-[380px]",
  [ModalWidth.DEFAULT]: "lg:w-[480px]",
  [ModalWidth.WIDE]: "lg:w-[720px]",
  [ModalWidth.XWIDE]: "lg:w-[1040px]",
  [ModalWidth.FULL]: "lg:w-[calc(100vw-2.5rem)]",
};

const WORKSPACE_INSETS: Partial<Record<ModalWidth, string>> = {
  [ModalWidth.XWIDE]: "lg:inset-x-[10vw] lg:inset-y-[8vh]",
  [ModalWidth.FULL]: "lg:inset-5",
};

const SHEET_CLASS =
  "inset-x-0 bottom-0 rounded-t-[calc(var(--jotty-radius-effective)*3)] border-b-0 lg:rounded-jotty lg:border-b";

const openStack: string[] = [];

trackFocus();

const isTopmost = (id: string) => openStack[openStack.length - 1] === id;

const portalRoot = (): HTMLElement => {
  const existing = document.getElementById(PORTAL_ID);
  if (existing) return existing;
  const root = document.createElement("div");
  root.id = PORTAL_ID;
  root.style.position = "fixed";
  root.style.top = "0";
  root.style.left = "0";
  root.style.zIndex = "9999";
  document.body.appendChild(root);
  return root;
};

const trapTab = (event: KeyboardEvent, panel: HTMLElement) => {
  const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null && !element.closest("[inert]"),
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && (active === first || active === panel || !panel.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
    event.preventDefault();
    first.focus();
  }
};

const shapeOf = (
  variant: ModalVariant,
  width: ModalWidth,
  isShown: boolean,
): string => {
  if (variant === ModalVariant.WORKSPACE) {
    return cn(
      "h-[92dvh] lg:h-auto",
      WORKSPACE_INSETS[width] ?? WORKSPACE_INSETS[ModalWidth.FULL],
      isShown
        ? "translate-y-0 opacity-100 lg:scale-100"
        : "translate-y-full opacity-0 lg:translate-y-0 lg:scale-[0.97]",
    );
  }
  if (variant === ModalVariant.PANEL) {
    return cn(
      "max-h-[92dvh] lg:inset-x-auto lg:left-auto lg:right-5 lg:top-5 lg:bottom-5 lg:max-h-none lg:max-w-[calc(100vw-2.5rem)]",
      WIDTHS[width],
      isShown
        ? "translate-y-0 opacity-100 lg:translate-x-0"
        : "translate-y-full opacity-0 lg:translate-y-0 lg:translate-x-[calc(100%+2.5rem)]",
    );
  }
  return cn(
    "max-h-[92dvh] lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-h-[calc(100dvh-2.5rem)] lg:max-w-[calc(100vw-2.5rem)] lg:-translate-x-1/2",
    WIDTHS[width],
    isShown
      ? "translate-y-0 opacity-100 lg:-translate-y-1/2 lg:scale-100"
      : "translate-y-full opacity-0 lg:-translate-y-[46%] lg:scale-[0.97]",
  );
};

const PANEL_BASE =
  "jotty-modal-content absolute flex flex-col overflow-hidden bg-card border border-border shadow-2xl outline-none transition-[transform,opacity] will-change-transform";

const backdropOf = (variant: ModalVariant, isShown: boolean) =>
  cn(
    "jotty-modal-backdrop absolute inset-0 transition-opacity",
    variant === ModalVariant.PANEL ? "bg-black/[0.35]" : "bg-black/50",
    MOTION,
    isShown ? "opacity-100" : "opacity-0",
  );

const slugOf = (title: ReactNode) =>
  typeof title === "string" ? title.replace(/ /g, "-").toLowerCase() : "custom";

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  kicker,
  description,
  footer,
  className = "",
  variant = ModalVariant.DIALOG,
  width,
  flush = false,
  allowEnlarge = false,
  defaultEnlarged = false,
  storageKey,
  closeOnEscape = true,
}: ModalProps) => {
  const t = useTranslations();
  const id = useId();
  const titleId = `${id}-title`;
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const closeAsked = useRef(false);
  const shownRef = useRef(false);
  const escapeRef = useRef(closeOnEscape);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isShown, setIsShown] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState(() =>
    readModalEnlarged(storageKey, defaultEnlarged),
  );

  useEffect(() => {
    onCloseRef.current = onClose;
    escapeRef.current = closeOnEscape;
  }, [onClose, closeOnEscape]);

  useEffect(() => {
    setPortal(portalRoot());
  }, []);

  useEffect(() => {
    shownRef.current = isShown;
  }, [isShown]);

  useLayoutEffect(
    () => () => {
      const node = wrapperRef.current;
      if (!closeAsked.current || !shownRef.current || !node) return;
      ghostOut(node, SLIDE_MS);
    },
    [],
  );

  useEffect(() => {
    if (isOpen) {
      closeAsked.current = false;
      setIsEnlarged(readModalEnlarged(storageKey, defaultEnlarged));
      setIsMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setIsShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }

    setIsShown(false);
    const timer = setTimeout(() => setIsMounted(false), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [isOpen, defaultEnlarged, storageKey]);

  const close = useCallback(() => {
    closeAsked.current = true;
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!isMounted || !portal) return;
    openStack.push(id);
    const panel = panelRef.current;
    const opener = lastFocusOutside(panel);
    if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopmost(id)) return;
      if (event.key === "Escape") {
        if (!escapeRef.current || event.defaultPrevented) return;
        close();
      } else if (event.key === "Tab" && panelRef.current) {
        trapTab(event, panelRef.current);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const index = openStack.indexOf(id);
      if (index !== -1) openStack.splice(index, 1);
      restoreFocus(opener, panel);
    };
  }, [isMounted, portal, close, id]);

  if (!isMounted || !portal) return null;

  const isWorkspace = variant === ModalVariant.WORKSPACE;
  const resolvedWidth = isEnlarged
    ? ModalWidth.FULL
    : (width ?? (isWorkspace ? ModalWidth.FULL : ModalWidth.DEFAULT));
  const fillsBody = isWorkspace;

  const panelClass = (shown: boolean) =>
    cn(PANEL_BASE, SHEET_CLASS, shapeOf(variant, resolvedWidth, shown), MOTION, className);

  const toggleEnlarged = () =>
    setIsEnlarged((prev) => {
      const next = !prev;
      writeModalEnlarged(storageKey, next);
      return next;
    });

  return createPortal(
    <div
      ref={wrapperRef}
      className={cn(
        `jotty-modal-${slugOf(title)} fixed inset-0 z-50`,
        !isShown && "pointer-events-none",
      )}
    >
      <div
        className={backdropOf(variant, isShown)}
        {...{ [EXIT_CLASS_ATTR]: backdropOf(variant, false) }}
        onMouseDown={close}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={panelClass(isShown)}
        {...{ [EXIT_CLASS_ATTR]: panelClass(false) }}
      >
        <div className="h-1 shrink-0 bg-primary/70" />
        <div className="lg:hidden mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25" />

        <header className="jotty-modal-header flex shrink-0 items-start gap-4 border-b border-dashed border-border px-6 pt-4 pb-4">
          <div className="min-w-0 flex-1">
            {kicker && (
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {kicker}
              </div>
            )}
            <h2
              id={titleId}
              className="jotty-modal-title flex min-w-0 items-center gap-2 text-xl font-semibold tracking-tight text-foreground"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-md lg:text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {allowEnlarge && isWorkspace && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleEnlarged}
                className="hidden lg:inline-flex h-7 w-7 p-0 text-muted-foreground"
                aria-label={isEnlarged ? t("common.shrink") : t("common.enlarge")}
              >
                {isEnlarged ? (
                  <MinimizeScreenIcon className="h-4 w-4" />
                ) : (
                  <MaximizeScreenIcon className="h-4 w-4" />
                )}
              </Button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label={t("common.close")}
              className="hidden lg:inline-flex items-center rounded-jotty border border-border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              esc
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={close}
              className="lg:hidden h-8 w-8 p-0 text-muted-foreground"
              aria-label={t("common.close")}
            >
              <MultiplicationSignIcon className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div
          className={cn(
            "jotty-modal-body min-h-0 flex-1",
            fillsBody
              ? "flex flex-col overflow-auto lg:overflow-hidden"
              : "jotty-scrollable-content overflow-y-auto overscroll-contain",
            !flush && "px-6 py-5",
          )}
        >
          {children}
        </div>

        {footer && (
          <footer className="jotty-modal-footer shrink-0 border-t border-dashed border-border px-6 py-3">
            {footer(close)}
          </footer>
        )}
      </div>
    </div>,
    portal,
  );
};
