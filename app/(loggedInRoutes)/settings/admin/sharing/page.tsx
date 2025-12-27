import { notFound } from "next/navigation";
import { AdminSharing } from "@/app/_components/FeatureComponents/Admin/Parts/Sharing/AdminSharing";
import { isAdmin } from "@/app/_server/actions/users";

export default async function AdminSharingPage() {
    const admin = await isAdmin();

    if (!admin) {
        return notFound();
    }

    return <AdminSharing />;
}
