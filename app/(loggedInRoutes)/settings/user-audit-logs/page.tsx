import { AuditLogsTabClient } from "@/app/_components/FeatureComponents/Profile/Parts/AuditLogsTabClient";
import { getAuditLogs } from "@/app/_server/actions/log";

export default async function UserAuditLogsPage() {
    const limit = 20;
    const result = await getAuditLogs({ limit, offset: 0 });

    const initialLogs = result.logs || [];
    const initialTotal = result.total || 0;

    return <AuditLogsTabClient initialLogs={initialLogs} initialTotal={initialTotal} />;
}
