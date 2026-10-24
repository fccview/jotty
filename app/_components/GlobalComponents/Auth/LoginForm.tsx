"use client";

import { useState, useEffect } from "react";
import { login } from "@/app/_server/actions/auth";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { LockKeyIcon } from "hugeicons-react";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { useTranslations } from "next-intl";
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";
import { FeedbackMessage } from "@/app/_components/GlobalComponents/Feedback/FeedbackMessage";
import { KICKER_CLASS } from "@/app/_consts/styling";
import { cn } from "@/app/_utils/global-utils";
import { SsoButton } from "@/app/_components/GlobalComponents/Auth/SsoButton";
import { useSsoError } from "@/app/_hooks/useSsoError";
import { forgetOfflineSidebar } from "@/app/_utils/offline/sidebar-cache";

const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "demodemo";
const DIVIDER_CLASS =
  "flex items-center gap-3 whitespace-nowrap before:flex-1 before:border-t before:border-dashed before:border-border after:flex-1 after:border-t after:border-dashed after:border-border";

export default function LoginForm({
  ssoEnabled,
  showRegisterLink = false,
}: {
  ssoEnabled: boolean;
  showRegisterLink?: boolean;
}) {
  const t = useTranslations("auth");
  const ssoError = useSsoError();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSsoLoading, setIsSsoLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    null,
  );
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    forgetOfflineSidebar().catch((error) => console.error("Could not clear the offline sidebar:", error));
  }, []);
  const { isDemoMode } = useAppMode();

  useEffect(() => {
    if (ssoError) {
      setError(ssoError);
    }
  }, [ssoError]);

  useEffect(() => {
    if (!lockedUntil) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const lockTime = new Date(lockedUntil).getTime();
      const remaining = Math.max(0, Math.ceil((lockTime - now) / 1000));

      setCountdown(remaining);

      if (remaining === 0) {
        setLockedUntil(null);
        setError("");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setAttemptsRemaining(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);

        if (result.lockedUntil) {
          setLockedUntil(result.lockedUntil);
          setAttemptsRemaining(0);
        } else if (result.attemptsRemaining !== undefined) {
          setAttemptsRemaining(result.attemptsRemaining);
        }

        setIsLoading(false);
      }
    } catch (error: unknown) {
      if (error && typeof error === "object" && "digest" in error) {
        const digest = (error as { digest?: string }).digest;
        if (digest?.startsWith("NEXT_REDIRECT")) {
          throw error;
        }
      }
      setError(t("errorOccurred"));
      setIsLoading(false);
    }
  }

  const isBusy = isLoading || isSsoLoading || countdown > 0;
  const showAttempts =
    !countdown && attemptsRemaining !== null && attemptsRemaining > 0 && attemptsRemaining < 4;
  const warning =
    countdown > 0
      ? t("accountLocked", { seconds: countdown })
      : showAttempts
        ? t("attemptsRemaining", { count: attemptsRemaining })
        : null;

  return (
    <>
      <FeedbackMessage
        error={warning ? null : error || null}
        success={null}
        warning={warning}
        icon={countdown > 0 ? <LockKeyIcon /> : undefined}
      />

      {ssoEnabled && (
        <>
          <SsoButton variant="outline" disabled={isLoading} onLoadingChange={setIsSsoLoading} />
          <div className={cn(KICKER_CLASS, DIVIDER_CLASS)}>{t("orContinueWith")}</div>
        </>
      )}

      {isDemoMode && (
        <div className="rounded-jotty border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5">
          <div className={cn(KICKER_CLASS, "mb-1.5 flex items-center gap-2")}>
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t("demoMode")}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-md lg:text-sm">
            <dt className="text-muted-foreground">{t("usernameLabel")}</dt>
            <dd className="font-mono">{DEMO_USERNAME}</dd>
            <dt className="text-muted-foreground">{t("passwordLabel")}</dt>
            <dd className="font-mono">{DEMO_PASSWORD}</dd>
          </dl>
        </div>
      )}

      <form onSubmit={handleSubmit} method="POST" className="space-y-4">
        <Input
          id="username"
          label={t("usernameLabel")}
          name="username"
          type="text"
          required
          disabled={isBusy}
          placeholder={t("enterUsername")}
          defaultValue=""
          autoComplete="username"
        />

        <Input
          id="password"
          label={t("passwordLabel")}
          name="password"
          type="password"
          required
          disabled={isBusy}
          placeholder={t("enterPassword")}
          autoComplete="current-password"
          defaultValue=""
        />

        <div className="flex items-center justify-end gap-2.5">
          <label
            htmlFor="rememberMe"
            className="cursor-pointer select-none text-sm text-muted-foreground lg:text-xs"
          >
            {t("rememberMe")}
          </label>
          <Toggle
            id="rememberMe"
            size="sm"
            checked={rememberMe}
            onCheckedChange={setRememberMe}
            disabled={isBusy}
          />
          <input type="hidden" name="rememberMe" value={String(rememberMe)} />
        </div>

        <Button type="submit" className="w-full gap-2" disabled={isBusy}>
          {isLoading && (
            <Logo className="h-4 w-4 bg-background animate-pulse" pathClassName="fill-primary" />
          )}
          {isLoading ? t("signingIn") : t("signInButton")}
        </Button>
      </form>

      {showRegisterLink && (
        <p className="text-center">
          <a
            href="/auth/setup"
            className="text-sm text-muted-foreground underline decoration-dashed underline-offset-4 transition-colors hover:text-foreground lg:text-xs"
          >
            {t("createAccount")}
          </a>
        </p>
      )}
    </>
  );
}
