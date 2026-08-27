import { notFound } from "next/navigation";
import { AdminOverview } from "@/app/_components/FeatureComponents/Admin/Parts/AdminOverview";
import { isAdmin, getUsersForAdmin } from "@/app/_server/actions/users";
import { getAllLists } from "@/app/_server/actions/checklist";
import { getAllNotes } from "@/app/_server/actions/note";

export default async function AdminOverviewPage() {
    const admin = await isAdmin();

    if (!admin) {
        return notFound();
    }

    const [usersData, listsData, docsData] = await Promise.all([
        getUsersForAdmin(),
        getAllLists(),
        getAllNotes(),
    ]);

    const users = usersData;
    const allLists = listsData.success && listsData.data ? listsData.data : [];
    const allDocs = docsData.success && docsData.data ? docsData.data : [];

    const stats = {
        totalUsers: users.length,
        totalChecklists: allLists.length,
        totalNotes: allDocs.length,
        adminUsers: users.filter((u) => u.isAdmin).length,
    };

    return <AdminOverview stats={stats} />;
}
