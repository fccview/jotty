import { redirect } from "next/navigation";
import { hasUsers } from "@/app/_server/actions/users";
import SetupForm from "@/app/(loggedOutRoutes)/auth/setup/setup-form";
import { AuthShell } from "@/app/_components/GlobalComponents/Auth/AuthShell";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const ssoEnabled = process.env.SSO_MODE === "oidc";
  const allowLocal =
    process.env.SSO_FALLBACK_LOCAL &&
    process.env.SSO_FALLBACK_LOCAL !== "no" &&
    process.env.SSO_FALLBACK_LOCAL !== "false";

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
