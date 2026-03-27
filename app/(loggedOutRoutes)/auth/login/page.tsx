import { redirect } from "next/navigation";
import { hasUsers } from "@/app/_server/actions/users";
import LoginForm from "@/app/_components/GlobalComponents/Auth/LoginForm";
import { AuthShell } from "@/app/_components/GlobalComponents/Auth/AuthShell";
import { getTranslations } from "next-intl/server";
import { SsoOnlyLogin } from "@/app/_components/GlobalComponents/Auth/SsoOnlyLogin";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  const ssoIsOidc = process.env.SSO_MODE === "oidc";
  const allowLocal =
    process.env.SSO_FALLBACK_LOCAL &&
    process.env.SSO_FALLBACK_LOCAL !== "no" &&
    process.env.SSO_FALLBACK_LOCAL !== "false";

  const hasExistingUsers = await hasUsers();
  if (!hasExistingUsers && (!process.env.SSO_MODE || allowLocal)) {
    redirect("/auth/setup");
  }

  if (ssoIsOidc && !allowLocal) {
    return <SsoOnlyLogin />;
  }

  return (
    <AuthShell>
      <div className="space-y-6">
        <LoginForm ssoEnabled={ssoIsOidc} />
      </div>
    </AuthShell>
  );
}
