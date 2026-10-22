import { redirect } from "next/navigation";
import { hasUsers } from "@/app/_server/actions/users";
import LoginForm from "@/app/_components/GlobalComponents/Auth/LoginForm";
import { AuthShell } from "@/app/_components/GlobalComponents/Auth/AuthShell";
import { getTranslations } from "next-intl/server";
import { SsoOnlyLogin } from "@/app/_components/GlobalComponents/Auth/SsoOnlyLogin";
import { isEnvEnabled, getAuthMode } from "@/app/_utils/env-utils";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  const authMode = getAuthMode();
  const ssoIsOidc = authMode === "oidc";
  const allowLocal = isEnvEnabled(process.env.SSO_FALLBACK_LOCAL);

  const hasExistingUsers = await hasUsers();
  if (!hasExistingUsers && !authMode) {
    redirect("/auth/setup");
  }

  if (ssoIsOidc && !allowLocal) {
    return <SsoOnlyLogin />;
  }

  const showRegisterLink = allowLocal && !hasExistingUsers;

  return (
    <AuthShell kicker={t("loginTitle")} title={t("welcomeBack")} description={t("signIn")}>
      <LoginForm ssoEnabled={ssoIsOidc} showRegisterLink={showRegisterLink} />
    </AuthShell>
  );
}
