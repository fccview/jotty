import { redirect } from "next/navigation";
import { hasUsers } from "@/app/_server/actions/users";
import LoginForm from "@/app/_components/GlobalComponents/Auth/LoginForm";
import { AuthShell } from "@/app/_components/GlobalComponents/Auth/AuthShell";
import { getTranslations } from "next-intl/server";
import { SsoOnlyLogin } from "@/app/_components/GlobalComponents/Auth/SsoOnlyLogin";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  const ssoEnabled = process.env.SSO_MODE === "oidc";
  const allowLocal =
    process.env.SSO_FALLBACK_LOCAL &&
    process.env.SSO_FALLBACK_LOCAL !== "no" &&
    process.env.SSO_FALLBACK_LOCAL !== "false";

  const hasExistingUsers = await hasUsers();
  if (!hasExistingUsers && !ssoEnabled || !hasExistingUsers && allowLocal) {
    redirect("/auth/setup");
  }

  if (ssoEnabled && !allowLocal) {
    return <SsoOnlyLogin />;
  }

  return (
    <AuthShell>
      <div className="space-y-6">
        <LoginForm ssoEnabled={ssoEnabled} />
      </div>
    </AuthShell>
  );
}
