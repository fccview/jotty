"use client";

import { Layout } from "@/app/_components/GlobalComponents/Layout/Layout";
import { Category, User } from "@/app/_types";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { HowtoSidebar } from "./HowtoSidebar";

interface HowtoClientProps {
    categories: Category[];
    user: User | null;
    children: React.ReactNode;
}

export const HowtoClient = ({
    categories,
    user,
    children,
}: HowtoClientProps) => {
    const { openSettings, openCreateCategoryModal } = useShortcut();

    return (
        <Layout
            categories={categories}
            onOpenSettings={openSettings}
            onOpenCreateModal={() => { }}
            onOpenCategoryModal={openCreateCategoryModal}
            user={user}
            customSidebar={(props) => <HowtoSidebar {...props} />}
        >
            <div className="w-full px-4 py-6 h-full overflow-y-auto">
                {children}
            </div>
        </Layout>
    );
};
