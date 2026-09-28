import { getTranslations } from "next-intl/server";
import { SessionsTabClient } from "@/app/_components/FeatureComponents/Profile/Parts/SessionsTabClient";
import { getMySessions } from "@/app/_server/actions/session";

export default async function SessionsPage() {
    const t = await getTranslations();
    const sessions = await getMySessions();

    if (!sessions) {
        return <div>{t('errors.unauthorized')}</div>;
    }

    return <SessionsTabClient initialSessions={sessions} />;
}
