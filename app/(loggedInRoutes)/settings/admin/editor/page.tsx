import { notFound } from "next/navigation";
import { EditorSettingsTab } from "@/app/_components/FeatureComponents/Admin/Parts/EditorSettingsTab";
import { isAdmin } from "@/app/_server/actions/users";

export default async function AdminEditorPage() {
    const admin = await isAdmin();

    if (!admin) {
        return notFound();
    }

    return <EditorSettingsTab />;
}
