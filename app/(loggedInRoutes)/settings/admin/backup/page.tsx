import { notFound } from "next/navigation";
import { isAdmin } from "@/app/_server/actions/users";
import { AdminBackupClient } from "@/app/_components/FeatureComponents/Admin/Parts/AdminBackupClient";
import { getBackupConfig, getBackupStatus, listSnapshots } from "@/app/_server/actions/backup";

export default async function AdminBackupPage() {
    const admin = await isAdmin();

    if (!admin) {
        return notFound();
    }

    // Pre-load config, status, and snapshots so the server component can
    // hydrate the client component with initial data (avoids a loading flash).
    const [configResult, statusResult, snapshotsResult] = await Promise.all([
        getBackupConfig(),
        getBackupStatus(),
        listSnapshots(),
    ]);

    return (
        <AdminBackupClient
            initialConfig={configResult.success ? configResult.data : undefined}
            initialStatus={statusResult.success ? statusResult.data : undefined}
            initialSnapshots={snapshotsResult.success && snapshotsResult.data ? snapshotsResult.data : []}
        />
    );
}