"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Key01Icon } from "hugeicons-react";
import { AuthShell } from "@/app/_components/GlobalComponents/Auth/AuthShell";
import { FeedbackMessage } from "@/app/_components/GlobalComponents/Feedback/FeedbackMessage";
import { buttonVariants } from "@/app/_components/GlobalComponents/Buttons/Button";

const OIDC_LOGIN_URL = "/api/oidc/login";

export const SsoOnlyLogin = () => {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "unauthorized") {
      setError(t("notAuthorized"));
    }
  }, [searchParams, t]);

  return (
    <AuthShell kicker={t("loginTitle")} title={t("welcomeBack")} description={t("signInWithOIDC")}>
      <FeedbackMessage error={error || null} success={null} />
      <a href={OIDC_LOGIN_URL} className={buttonVariants({ className: "w-full gap-2" })}>
        <Key01Icon className="h-4 w-4" />
        {t("signInWithSSO")}
      </a>
    </AuthShell>
  );
};
