import { AdminAuditLogsClient } from "@/app/_components/FeatureComponents/Admin/Parts/AdminAuditLogsClient";
import { getAuditLogs, checkCleanupNeeded } from "@/app/_server/actions/log";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/app/_server/actions/users";

export default async function AdminAuditLogsPage() {
    const admin = await isAdmin();

    if (!admin) {
        return notFound();
    }

    const limit = 20;
    const result = await getAuditLogs({ limit, offset: 0 });
    const cleanupCheck = await checkCleanupNeeded();

    const initialLogs = result.logs || [];
    const initialTotal = result.total || 0;

    return (
        <AdminAuditLogsClient
            initialLogs={initialLogs}
            initialTotal={initialTotal}
            cleanupNeeded={cleanupCheck.needed}
            oldLogsCount={cleanupCheck.count}
            maxLogAge={cleanupCheck.maxAge}
        />
    );
}
