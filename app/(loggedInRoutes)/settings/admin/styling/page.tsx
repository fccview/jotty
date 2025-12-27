import { notFound } from "next/navigation";
import { StylingTab } from "@/app/_components/FeatureComponents/Admin/Parts/StylingTab";
import { isAdmin } from "@/app/_server/actions/users";

export default async function AdminStylingPage() {
    const admin = await isAdmin();

    if (!admin) {
        return notFound();
    }

    return <StylingTab />;
}
