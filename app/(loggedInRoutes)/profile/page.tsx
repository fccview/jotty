import { UserProfileClient } from "@/app/_components/FeatureComponents/Profile/UserProfileClient";
import { SiteHeader } from "@/app/_components/GlobalComponents/Layout/SiteHeader";
import { isAdmin, getCurrentUser } from "@/app/_server/actions/users";
import { getLoginType } from "@/app/_server/actions/session";
import { getArchivedItems } from "@/app/_server/actions/archived";
import { getCategories } from "@/app/_server/actions/category";
import { Modes } from "@/app/_types/enums";

export default async function ProfilePage() {
  const admin = await isAdmin();
  const loginType = await getLoginType();
  const isSsoUser = loginType === "sso";
  const user = await getCurrentUser();
  const avatarUrl = user?.avatarUrl;

  const [archivedResult, listsCategoriesResult, notesCategoriesResult] =
    await Promise.all([
      getArchivedItems(),
      getCategories(Modes.CHECKLISTS),
      getCategories(Modes.NOTES),
    ]);

  const archivedItems = archivedResult.success ? archivedResult.data : [];
  const listsCategories = listsCategoriesResult.success
    ? listsCategoriesResult.data
    : [];
  const notesCategories = notesCategoriesResult.success
    ? notesCategoriesResult.data
    : [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <UserProfileClient
        isAdmin={admin}
        isSsoUser={isSsoUser}
        avatarUrl={avatarUrl}
        archivedItems={archivedItems || []}
        listsCategories={listsCategories || []}
        notesCategories={notesCategories || []}
      />
    </div>
  );
}
