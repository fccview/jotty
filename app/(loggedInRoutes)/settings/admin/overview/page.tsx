import { notFound } from "next/navigation";
import { AdminOverview } from "@/app/_components/FeatureComponents/Admin/Parts/AdminOverview";
import { isAdmin, getUsersForAdmin } from "@/app/_server/actions/users";
import { adminCounts } from "@/app/_server/actions/admin/library";

export default async function AdminOverviewPage() {
    const admin = await isAdmin();

    if (!admin) {
        return notFound();
    }

    const users = await getUsersForAdmin();
    const counts = await adminCounts(users.map((user) => user.username));
    const perUser = Object.values(counts);

    const stats = {
        totalUsers: users.length,
        totalChecklists: perUser.reduce((sum, count) => sum + count.checklists, 0),
        totalNotes: perUser.reduce((sum, count) => sum + count.notes, 0),
        adminUsers: users.filter((u) => u.isAdmin).length,
    };

    return <AdminOverview stats={stats} />;
}
