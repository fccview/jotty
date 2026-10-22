"use client";

import { MouseEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Key01Icon } from "hugeicons-react";
import { buttonVariants } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { OIDC_LOGIN_URL } from "@/app/_consts/sso";

interface SsoButtonProps {
  variant?: "default" | "outline";
  disabled?: boolean;
  onLoadingChange?: (isLoading: boolean) => void;
}

const SSO_BUTTON_CLASS = "w-full gap-2 aria-disabled:pointer-events-none aria-disabled:opacity-50";

export const SsoButton = ({ variant = "default", disabled = false, onLoadingChange }: SsoButtonProps) => {
  const t = useTranslations("auth");
  const [isLoading, setIsLoading] = useState(false);
  const isBlocked = disabled || isLoading;

  useEffect(() => {
    const resetOnRestore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setIsLoading(false);
      onLoadingChange?.(false);
    };
    window.addEventListener("pageshow", resetOnRestore);
    return () => window.removeEventListener("pageshow", resetOnRestore);
  }, [onLoadingChange]);

  const startSso = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isBlocked) {
      event.preventDefault();
      return;
    }
    setIsLoading(true);
    onLoadingChange?.(true);
  };

  return (
    <a
      href={OIDC_LOGIN_URL}
      role="button"
      aria-disabled={isBlocked}
      aria-busy={isLoading}
      tabIndex={isBlocked ? -1 : undefined}
      onClick={startSso}
      className={buttonVariants({ variant, className: SSO_BUTTON_CLASS })}
    >
      {isLoading ? (
        variant === "outline" ? (
          <Logo className="h-4 w-4 animate-pulse" />
        ) : (
          <Logo className="h-4 w-4 bg-background animate-pulse" pathClassName="fill-primary" />
        )
      ) : (
        <Key01Icon className="h-4 w-4" />
      )}
      {isLoading ? t("signingIn") : t("signInWithSSO")}
    </a>
  );
};
