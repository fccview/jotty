import { redirect } from "next/navigation";
import { hasUsers } from "@/app/_server/actions/users";
import SetupForm from "@/app/(loggedOutRoutes)/auth/setup/setup-form";
import { isEnvEnabled, getAuthMode } from "@/app/_utils/env-utils";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const allowLocal = isEnvEnabled(process.env.SSO_FALLBACK_LOCAL);

  if (getAuthMode() && !allowLocal) {
    redirect("/auth/login");
  }

  const hasExistingUsers = await hasUsers();
  if (hasExistingUsers) {
    redirect("/auth/login");
  }

  return <SetupForm />;
}
