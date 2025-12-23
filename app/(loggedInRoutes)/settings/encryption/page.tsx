import { EncryptionTabClient } from "@/app/_components/FeatureComponents/Profile/Parts/EncryptionTabClient";
import { getStoredKeys } from "@/app/_server/actions/pgp";

export default async function EncryptionPage() {
    const keysResult = await getStoredKeys();
    const initialKeyData = {
        hasKeys: keysResult.success && keysResult.data ? keysResult.data.hasKeys : false,
        metadata: (keysResult.success && keysResult.data?.metadata) || null,
    };

    return <EncryptionTabClient initialKeyData={initialKeyData} />;
}
