import { UserProfileClient } from "@/app/_components/FeatureComponents/Profile/UserProfileClient";
import { SiteHeader } from "@/app/_components/GlobalComponents/Layout/SiteHeader";
import { isAdmin, getCurrentUser } from "@/app/_server/actions/users";
import { getLoginType } from "@/app/_server/actions/session";

export default async function ProfilePage() {
  const admin = await isAdmin();
  const loginType = await getLoginType();
  const isSsoUser = loginType === "sso";
  const user = await getCurrentUser();
  const avatarUrl = user?.avatarUrl;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <UserProfileClient
        isAdmin={admin}
        isSsoUser={isSsoUser}
        avatarUrl={avatarUrl}
      />
    </div>
  );
}
