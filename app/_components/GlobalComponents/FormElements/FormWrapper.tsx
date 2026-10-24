"use client";

import { ReactNode, useState } from "react";
import { ArrowDown01Icon, ArrowRight01Icon } from "hugeicons-react";

interface FormWrapperProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  contentMaxHeight?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export const FormWrapper = ({
  title,
  children,
  action,
  contentMaxHeight,
  collapsible = false,
  defaultOpen = true,
}: FormWrapperProps) => {
  const [isOpen, setIsOpen] = useState(!collapsible || defaultOpen);
  const Chevron = isOpen ? ArrowDown01Icon : ArrowRight01Icon;

  return (
    <div className="jotty-form-wrapper bg-background border border-border rounded-jotty p-6">
      <div
        className={`jotty-form-wrapper-header flex items-center justify-between ${
          isOpen ? "mb-4" : ""
        }`}
      >
        {collapsible ? (
          <button
            type="button"
            className={`flex items-center justify-between w-[calc(100%+3rem)] -mx-6 -mt-6 px-6 pt-6 text-left cursor-pointer ${
              isOpen ? "" : "-mb-6 pb-6"
            }`}
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
          >
            <h3 className="text-lg font-semibold">{title}</h3>
            <Chevron className="h-5 w-5" />
          </button>
        ) : (
          <h3 className="text-lg font-semibold">{title}</h3>
        )}
        {action}
      </div>
      {isOpen && (
        <div
          className={`jotty-form-wrapper-content space-y-6 ${
            contentMaxHeight ? `max-h-[${contentMaxHeight}] overflow-y-auto` : ""
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};
