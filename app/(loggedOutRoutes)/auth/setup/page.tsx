import { redirect } from "next/navigation";
import { hasUsers } from "@/app/_server/actions/users";
import SetupForm from "@/app/(loggedOutRoutes)/auth/setup/setup-form";
import { AuthShell } from "@/app/_components/GlobalComponents/Auth/AuthShell";
import { isEnvEnabled } from "@/app/_utils/env-utils";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const ssoEnabled = process.env.SSO_MODE === "oidc";
  const allowLocal = isEnvEnabled(process.env.SSO_FALLBACK_LOCAL);

  if (ssoEnabled && !allowLocal) {
    redirect("/auth/login");
  }

  const hasExistingUsers = await hasUsers();
  if (hasExistingUsers) {
    redirect("/auth/login");
  }

  return (
    <AuthShell>
      <SetupForm />
    </AuthShell>
  );
}
