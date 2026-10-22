"use client";

import { useTranslations } from "next-intl";
import { AuthShell } from "@/app/_components/GlobalComponents/Auth/AuthShell";
import { SsoButton } from "@/app/_components/GlobalComponents/Auth/SsoButton";
import { FeedbackMessage } from "@/app/_components/GlobalComponents/Feedback/FeedbackMessage";
import { useSsoError } from "@/app/_hooks/useSsoError";

export const SsoOnlyLogin = () => {
  const t = useTranslations("auth");
  const ssoError = useSsoError();

  return (
    <AuthShell kicker={t("loginTitle")} title={t("welcomeBack")} description={t("signInWithOIDC")}>
      <FeedbackMessage error={ssoError || null} success={null} />
      <SsoButton />
    </AuthShell>
  );
};
