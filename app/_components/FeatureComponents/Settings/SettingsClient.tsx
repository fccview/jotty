"use client";

import { Layout } from "@/app/_components/GlobalComponents/Layout/Layout";
import { Category, SanitisedUser } from "@/app/_types";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";

interface SettingsClientProps {
    categories: Category[];
    user: SanitisedUser | null;
    children: React.ReactNode;
}

export const SettingsClient = ({
    categories,
    user,
    children,
}: SettingsClientProps) => {
    const { openSettings, openCreateCategoryModal } = useShortcut();

    return (
        <Layout
            categories={categories}
            onOpenSettings={openSettings}
            onOpenCreateModal={() => { }}
            onOpenCategoryModal={openCreateCategoryModal}
            user={user}
        >
            <div className="w-full px-4 py-6 h-full overflow-y-auto">
                {children}
            </div>
        </Layout>
    );
};
