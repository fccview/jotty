import { SessionsTabClient } from "@/app/_components/FeatureComponents/Profile/Parts/SessionsTabClient";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getSessionsForUser, getSessionId } from "@/app/_server/actions/session";

export default async function SessionsPage() {
    const currentUser = await getCurrentUser();
    const sessionId = await getSessionId();

    if (!currentUser) {
        return <div>Not authenticated</div>;
    }

    const sessionsData = await getSessionsForUser(currentUser.username);
    const sessions = sessionsData?.map((session) => ({
        ...session,
        isCurrent: session.id === sessionId,
    })) || [];

    return <SessionsTabClient initialSessions={sessions} />;
}
