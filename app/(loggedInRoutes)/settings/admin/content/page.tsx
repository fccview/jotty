import { AdminContent } from "@/app/_components/FeatureComponents/Admin/Parts/AdminContent";
import { adminLibrary } from "@/app/_server/actions/admin/library";
import { canAccessAllContent, getUsersForAdmin } from "@/app/_server/actions/users";
import { notFound } from "next/navigation";

export default async function AdminContentPage() {
    const hasAccess = await canAccessAllContent();

    if (!hasAccess) {
        return notFound();
    }

    const users = await getUsersForAdmin();
    const library = await adminLibrary(users.map((user) => user.username));

    return <AdminContent allLists={library.checklists} allDocs={library.notes} users={users} />;
}
