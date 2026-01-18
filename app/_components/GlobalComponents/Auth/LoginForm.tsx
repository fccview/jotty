"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "@/app/_server/actions/auth";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Orbit01Icon } from "hugeicons-react";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { useTranslations } from "next-intl";

export default function LoginForm({ ssoEnabled }: { ssoEnabled: boolean }) {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSsoLoading, setIsSsoLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const { isDemoMode, appVersion, isRwMarkable } = useAppMode();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "unauthorized") {
      setError(t("notAuthorized"));
    }
  }, [searchParams, t]);

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
      setError(t('errorOccurred'));
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('welcomeBack')}
        </h1>
      </div>

      {ssoEnabled && (
        <div className="space-y-3">
          <Button
            className="w-full"
            disabled={isLoading || isSsoLoading}
            onClick={() => {
              setIsSsoLoading(true);
              window.location.href = "/api/oidc/login";
            }}
          >
            {isSsoLoading ? (
              <>
                <Logo className="h-4 w-4 mr-2 animate-pulse" /> {t('signingIn')}
              </>
            ) : (
              t('signInWithSSO')
            )}
          </Button>
          <div className="relative !mt-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-sm lg:text-xs text-muted-foreground">
              <span className="bg-background px-2">
                {t('orContinueWith')}
              </span>
            </div>
          </div>
        </div>
      )}

      {isDemoMode && (
        <div className="bg-muted p-3 rounded-jotty">
          <strong>{t('usernameLabel')}: </strong>demo <br />
          <strong>{t('passwordLabel')}: </strong>demodemo
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-jotty">
            <span className="text-md lg:text-sm text-destructive">{error}</span>
          </div>
        )}

        {countdown > 0 && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-jotty">
            <span className="text-md lg:text-sm text-warning">
              {t('accountLocked', { seconds: countdown })}
            </span>
          </div>
        )}

        {!countdown && attemptsRemaining !== null && attemptsRemaining > 0 && attemptsRemaining < 4 && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-jotty">
            <span className="text-md lg:text-sm text-warning">
              {t('attemptsRemaining', { count: attemptsRemaining })}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <Input
            id="username"
            label={t('usernameLabel')}
            name="username"
            type="text"
            required
            disabled={isLoading || isSsoLoading || countdown > 0}
            className="mt-1"
            placeholder={t('enterUsername')}
            defaultValue=""
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <Input
            id="password"
            label={t('passwordLabel')}
            name="password"
            type="password"
            required
            disabled={isLoading || isSsoLoading || countdown > 0}
            className="mt-1"
            placeholder={t('enterPassword')}
            autoComplete="current-password"
            defaultValue=""
          />
        </div>

        <Button
          type="submit"
          className="w-full !mt-8"
          disabled={isLoading || isSsoLoading || countdown > 0}
        >
          {isLoading ? (
            <>
              <Logo className="h-4 w-4 bg-background mr-2 animate-pulse" pathClassName="fill-primary" /> {t('signingIn')}
            </>
          ) : (
            t('signInButton')
          )}
        </Button>
      </form>

      {appVersion && (
        <div className="text-center text-sm lg:text-xs text-muted-foreground">
          <a target="_blank" href={`https://github.com/fccview/jotty/releases/tag/${appVersion}`}>{t('version', { version: appVersion })}</a>
        </div>
      )}
    </div>
  );
}
