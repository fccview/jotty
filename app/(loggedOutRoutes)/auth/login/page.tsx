import { redirect } from "next/navigation";
import { hasUsers } from "@/app/_server/actions/users";
import LoginForm from "@/app/(loggedOutRoutes)/auth/login/login-form";
import { AuthShell } from "@/app/_components/GlobalComponents/Auth/AuthShell";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const ssoEnabled = process.env.SSO_MODE === "oidc";
  const t = await getTranslations();
  const allowLocal =
    process.env.SSO_FALLBACK_LOCAL &&
    process.env.SSO_FALLBACK_LOCAL !== "no" &&
    process.env.SSO_FALLBACK_LOCAL !== "false";

  const hasExistingUsers = await hasUsers();
  if (
    (!hasExistingUsers && ssoEnabled && allowLocal) ||
    (!hasExistingUsers && !ssoEnabled)
  ) {
    redirect("/auth/setup");
  }

  if (ssoEnabled && !allowLocal) {
    return (
      <AuthShell>
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("auth.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("auth.sign_in_with_oidc")}
            </p>
          </div>
          <a
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
            href="/api/oidc/login"
          >
            {t("auth.sign_in")}
          </a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-6">
        <LoginForm ssoEnabled={ssoEnabled} />
      </div>
    </AuthShell>
  );
}
