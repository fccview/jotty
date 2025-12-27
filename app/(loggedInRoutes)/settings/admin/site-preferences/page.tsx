import { notFound } from "next/navigation";
import { AppSettingsTab } from "@/app/_components/FeatureComponents/Admin/Parts/AppSettingsTab";
import { isAdmin } from "@/app/_server/actions/users";

export default async function AdminSitePreferencesPage() {
    const admin = await isAdmin();

    if (!admin) {
        return notFound();
    }

    return <AppSettingsTab />;
}
