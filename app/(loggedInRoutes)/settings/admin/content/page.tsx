import { AdminContent } from "@/app/_components/FeatureComponents/Admin/Parts/AdminContent";
import { getAllLists } from "@/app/_server/actions/checklist/queries";
import { getAllNotes } from "@/app/_server/actions/note/queries";
import { canAccessAllContent, getUsersForAdmin } from "@/app/_server/actions/users";
import { notFound } from "next/navigation";

export default async function AdminContentPage() {
    const hasAccess = await canAccessAllContent();

    if (!hasAccess) {
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

    return <AdminContent allLists={allLists} allDocs={allDocs} users={users} />;
}
