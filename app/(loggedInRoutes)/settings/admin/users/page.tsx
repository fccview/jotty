import { AdminUsersClient } from "@/app/_components/FeatureComponents/Admin/Parts/AdminUsersClient";
import { adminCounts } from "@/app/_server/actions/admin/library";
import { isAdmin, getUsername, getUsersForAdmin } from "@/app/_server/actions/users";
import { notFound } from "next/navigation";

export default async function AdminUsersPage() {
    const admin = await isAdmin();
    const username = await getUsername();

    if (!admin) {
        return notFound();
    }

    const users = await getUsersForAdmin();
    const counts = await adminCounts(users.map((user) => user.username));

    return (
        <AdminUsersClient
            initialUsers={users}
            counts={counts}
            username={username}
        />
    );
}
