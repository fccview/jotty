import { AdminUsersClient } from "@/app/_components/FeatureComponents/Admin/Parts/AdminUsersClient";
import { getAllLists } from "@/app/_server/actions/checklist";
import { getAllNotes } from "@/app/_server/actions/note";
import { isAdmin, getUsername, getUsersForAdmin } from "@/app/_server/actions/users";
import { notFound } from "next/navigation";

export default async function AdminUsersPage() {
    const admin = await isAdmin();
    const username = await getUsername();

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

    return (
        <AdminUsersClient
            initialUsers={users}
            initialLists={allLists}
            initialDocs={allDocs}
            username={username}
        />
    );
}
