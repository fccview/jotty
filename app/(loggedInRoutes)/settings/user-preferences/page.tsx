"use client";

import { UserPreferencesTab } from "@/app/_components/FeatureComponents/Profile/Parts/UserPreferencesTab";
import { useState } from "react";
import { DeleteAccountModal } from "@/app/_components/GlobalComponents/Modals/UserModals/DeleteAccountModal";

export default function UserPreferencesPage() {
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    return (
        <>
            <UserPreferencesTab setShowDeleteModal={setShowDeleteModal} />
            <DeleteAccountModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
            />
        </>
    );
}
