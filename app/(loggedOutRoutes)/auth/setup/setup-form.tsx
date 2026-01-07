"use client";

import { useState } from "react";
import { register } from "@/app/_server/actions/auth";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { useTranslations } from "next-intl";

export default function SetupForm() {
  const t = useTranslations('auth');
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { isRwMarkable } = useAppMode();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError("");

    try {
      const result = await register(formData);
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('welcomeTo', { appName: isRwMarkable ? "rwMarkable" : "jotty·page" })}
        </h1>
        <p className="text-md lg:text-sm text-muted-foreground">
          {t('createAdminAccountDescription')}
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-jotty">
            <span className="text-md lg:text-sm text-destructive">{error}</span>
          </div>
        )}

        <Input
          id="username"
          name="username"
          label={t('usernameLabel')}
          type="text"
          placeholder={t('chooseUsername')}
          required
          disabled={isLoading}
        />

        <Input
          id="password"
          name="password"
          label={t('passwordLabel')}
          type="password"
          placeholder={t('choosePassword')}
          required
          disabled={isLoading}
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          label={t('confirmPasswordLabel')}
          type="password"
          placeholder={t('confirmYourPassword')}
          required
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-jotty text-md lg:text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
        >
          {isLoading ? t('creatingAccount') : t('createAdminAccount')}
        </button>
      </form>
    </div>
  );
}
