import { AuditLogsTabClient } from "@/app/_components/FeatureComponents/Profile/Parts/AuditLogsTabClient";
import { getAuditLogs, checkCleanupNeeded } from "@/app/_server/actions/log";
import { getCurrentUser } from "@/app/_server/actions/users";

export default async function UserAuditLogsPage() {
    const user = await getCurrentUser();
    const limit = 20;
    const result = await getAuditLogs({ limit, offset: 0 });
    const cleanupCheck = await checkCleanupNeeded(user?.username);

    const initialLogs = result.logs || [];
    const initialTotal = result.total || 0;

    return (
        <AuditLogsTabClient
            initialLogs={initialLogs}
            initialTotal={initialTotal}
            cleanupNeeded={cleanupCheck.needed}
            oldLogsCount={cleanupCheck.count}
            maxLogAge={cleanupCheck.maxAge}
        />
    );
}
