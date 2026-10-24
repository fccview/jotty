"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { register } from "@/app/_server/actions/auth";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { AppName } from "@/app/_components/GlobalComponents/Layout/AppName";
import { AuthShell } from "@/app/_components/GlobalComponents/Auth/AuthShell";
import { FeedbackMessage } from "@/app/_components/GlobalComponents/Feedback/FeedbackMessage";

const APP_NAME_SLOT = "\u0000";
const RW_MARKABLE = "rwMarkable";

const SetupForm = () => {
  const t = useTranslations();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { isRwMarkable } = useAppMode();

  const [titleStart, titleEnd = ""] = t("auth.welcomeTo", { appName: APP_NAME_SLOT }).split(APP_NAME_SLOT);
  const title = (
    <>
      {titleStart}
      <AppName fallback={isRwMarkable ? RW_MARKABLE : undefined} />
      {titleEnd}
    </>
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await register(new FormData(e.currentTarget));
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      kicker={t("auth.setupTitle")}
      badge={t("common.admin")}
      title={title}
      description={t("auth.createAdminAccountDescription")}
    >
      <FeedbackMessage error={error || null} success={null} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="username"
          name="username"
          label={t("auth.usernameLabel")}
          type="text"
          placeholder={t("auth.chooseUsername")}
          autoComplete="username"
          required
          disabled={isLoading}
        />

        <div className="space-y-4 border-t border-dashed border-border pt-4">
          <Input
            id="password"
            name="password"
            label={t("auth.passwordLabel")}
            type="password"
            placeholder={t("auth.choosePassword")}
            autoComplete="new-password"
            required
            disabled={isLoading}
          />

          <Input
            id="confirmPassword"
            name="confirmPassword"
            label={t("auth.confirmPasswordLabel")}
            type="password"
            placeholder={t("auth.confirmYourPassword")}
            autoComplete="new-password"
            required
            disabled={isLoading}
          />
        </div>

        <Button type="submit" className="!mt-6 w-full gap-2" disabled={isLoading}>
          {isLoading && (
            <Logo className="h-4 w-4 bg-background animate-pulse" pathClassName="fill-primary" />
          )}
          {isLoading ? t("auth.creatingAccount") : t("auth.createAdminAccount")}
        </Button>
      </form>
    </AuthShell>
  );
};

export default SetupForm;
