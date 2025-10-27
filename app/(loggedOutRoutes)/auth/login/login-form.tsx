"use client";

import { useState } from "react";
import { login } from "@/app/_server/actions/auth";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function LoginForm({ ssoEnabled }: { ssoEnabled: boolean }) {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { isDemoMode, appVersion, isRwMarkable } = useAppMode();
  const t = useTranslations();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError("");

    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("auth.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {ssoEnabled ? t("auth.choose_access") : t("auth.enter_credentials")} {isRwMarkable ? "rwMarkable" : "jotty·page"}
        </p>
      </div>

      {ssoEnabled && (
        <div className="space-y-3">
          <a
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
            href="/api/oidc/login"
          >
            {t("auth.sign_in_with_sso")}
          </a>
          <div className="relative !mt-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-background px-2">{t("auth.or_continue_with_local_account")}</span>
            </div>
          </div>
        </div>
      )}

      {isDemoMode && (
        <div className="bg-muted p-3 rounded-md">
          <strong>username: </strong>demo <br />
          <strong>password: </strong>demodemo
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Input
            id="username"
            label={t("auth.username")}
            name="username"
            type="text"
            required
            disabled={isLoading}
            className="mt-1"
            placeholder={t("auth.username_placeholder")}
            defaultValue=""
          />
        </div>

        <div className="space-y-2">
          <Input
            id="password"
            label={t("auth.password")}
            name="password"
            type="password"
            required
            disabled={isLoading}
            className="mt-1"
            placeholder={t("auth.password_placeholder")}
            defaultValue=""
          />
        </div>

        <Button type="submit" className="w-full !mt-8" disabled={isLoading}>
          {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("auth.signing_in")}</> : t("auth.sign_in")}
        </Button>
      </form>

      {
        appVersion && (
          <div className="text-center text-xs text-muted-foreground">
            {t("auth.version")} {appVersion}
          </div>
        )
      }
    </div >
  );
}
