"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { AuthShell } from "@/app/_components/GlobalComponents/Auth/AuthShell";

export const SsoOnlyLogin = () => {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");
  const { appVersion } = useAppMode();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "unauthorized") {
      setError(t("notAuthorized"));
    }
  }, [searchParams, t]);

  return (
    <AuthShell>
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("welcomeBack")}
          </h1>
          <p className="text-md lg:text-sm text-muted-foreground">
            {t("signInWithOIDC")}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-jotty">
            <span className="text-md lg:text-sm text-destructive">{error}</span>
          </div>
        )}

        <a
          className="inline-flex items-center justify-center rounded-jotty text-md lg:text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
          href="/api/oidc/login"
        >
          {t("signInButton")}
        </a>

        {appVersion && (
          <div className="text-center text-sm lg:text-xs text-muted-foreground">
            <a
              target="_blank"
              href={`https://github.com/fccview/jotty/releases/tag/${appVersion}`}
            >
              {t("version", { version: appVersion })}
            </a>
          </div>
        )}
      </div>
    </AuthShell>
  );
};
