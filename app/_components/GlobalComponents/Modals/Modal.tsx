"use client";

import { useRef, useEffect, useState } from "react";
import { MultiplicationSignIcon } from "hugeicons-react";
import { Button } from "../Buttons/Button";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className = "",
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

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

  if (!isOpen || !portalElement) {
    return null;
  }

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
          bg-background border border-border w-full lg:max-w-md shadow-xl
          lg:rounded-md rounded-t-xl p-6
          translate-y-0 lg:translate-y-0
          transition-all duration-200
          ${className}
        `}
      >
        <div className="jotty-modal-header flex items-center justify-between mb-6">
          <div className="lg:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-muted-foreground/20" />

          <div className="jotty-modal-title text-xl font-bold text-foreground flex items-center">
            {title}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
          >
            <MultiplicationSignIcon className="h-4 w-4" />
          </Button>
        </div>

        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, portalElement);
};
