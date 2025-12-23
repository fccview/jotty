import { redirect } from "next/navigation";
import { AdminClient } from "@/app/_components/FeatureComponents/Admin/AdminClient";
import { isAdmin, getUsername } from "@/app/_server/actions/users";

export default async function AdminPage() {
  const admin = await isAdmin();
  const username = await getUsername();

  if (!admin) {
    redirect("/");
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <AdminClient username={username} />
    </div>
  );
}
