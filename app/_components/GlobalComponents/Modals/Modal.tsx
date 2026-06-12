"use client";

import { useRef, useEffect, useState } from "react";
import {
  MaximizeScreenIcon,
  MinimizeScreenIcon,
  MultiplicationSignIcon,
} from "hugeicons-react";
import { Button } from "../Buttons/Button";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: "default" | "fullscreen";
  allowEnlarge?: boolean;
  defaultEnlarged?: boolean;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className = "",
  size = "default",
  allowEnlarge = false,
  defaultEnlarged = false,
}: ModalProps) => {
  const t = useTranslations();
  const modalRef = useRef<HTMLDivElement>(null);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  const [isEnlarged, setIsEnlarged] = useState(defaultEnlarged);

  useEffect(() => {
    let portalRoot = document.getElementById("modal-portal-root");
    if (!portalRoot) {
      portalRoot = document.createElement("div");
      portalRoot.id = "modal-portal-root";
      portalRoot.style.position = "fixed";
      portalRoot.style.top = "0";
      portalRoot.style.left = "0";
      portalRoot.style.zIndex = "9999";
      document.body.appendChild(portalRoot);
    }
    setPortalElement(portalRoot);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsEnlarged(defaultEnlarged);
    }
  }, [isOpen, defaultEnlarged]);

  if (!isOpen || !portalElement) {
    return null;
  }

  const isFullscreenLayout = size === "fullscreen" || isEnlarged;

  const enlargedDesktopClasses =
    "lg:!w-[calc(100vw-2.5em)] lg:!h-[calc(100dvh-2.5em)] lg:!max-w-[calc(100vw-2.5em)] lg:!max-h-[calc(100dvh-2.5em)]";

  const modalContent = (
    <div
      className={`jotty-modal-${title
        ?.toString()
        .replace(/ /g, "-")
        .toLowerCase()} fixed inset-0 bg-black/50 flex lg:items-center lg:justify-center items-end z-50`}
    >
      <div
        ref={modalRef}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`
          jotty-modal-content
          bg-background border border-border shadow-xl
          translate-y-0 lg:translate-y-0 transition-all duration-200
          w-full
          ${size === "fullscreen"
            ? "h-[90vh] flex flex-col lg:rounded-jotty rounded-t-xl overflow-hidden lg:w-[95vw]"
            : "lg:max-w-md lg:rounded-md rounded-t-xl p-6"}
          ${className}
          ${isEnlarged ? enlargedDesktopClasses : ""}
        `}
      >
        <div className={`jotty-modal-header flex items-center justify-between ${isFullscreenLayout ? "p-3 border-b border-border shrink-0" : "mb-6"}`}>
          <div className="lg:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-muted-foreground/20" />

          <div className="jotty-modal-title text-xl font-bold text-foreground flex items-center min-w-0">
            {title}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {allowEnlarge && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEnlarged((prev) => !prev)}
                className="hidden lg:inline-flex h-8 w-8 p-0"
                aria-label={isEnlarged ? t("common.shrink") : t("common.enlarge")}
              >
                {isEnlarged ? (
                  <MinimizeScreenIcon className="h-4 w-4" />
                ) : (
                  <MaximizeScreenIcon className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              aria-label={t("common.close")}
            >
              <MultiplicationSignIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className={isFullscreenLayout ? "flex min-h-0 flex-1 flex-col overflow-auto lg:overflow-hidden" : ""}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, portalElement);
};
