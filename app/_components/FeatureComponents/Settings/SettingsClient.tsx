"use client";

import { Layout } from "@/app/_components/GlobalComponents/Layout/Layout";
import { Category, User } from "@/app/_types";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";

interface SettingsClientProps {
    categories: Category[];
    user: User | null;
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
            <div className="container mx-auto px-4 py-6 max-w-7xl h-full overflow-y-auto">
                {children}
            </div>
        </Layout>
    );
};
