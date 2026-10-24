"use client";

import { useLocale } from "next-intl";
import { Layout } from "@/app/_components/GlobalComponents/Layout/Layout";
import { Category, SanitisedUser } from "@/app/_types";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { HowtoSidebar } from "./HowtoSidebar";
import { MobileHeader } from "../../GlobalComponents/Layout/MobileHeader";

interface HowtoClientProps {
    categories: Category[];
    user: SanitisedUser | null;
    children: React.ReactNode;
}

export const HowtoClient = ({
    categories,
    user,
    children,
}: HowtoClientProps) => {
  const locale = useLocale();
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
            <MobileHeader user={user} onOpenSettings={openSettings} currentLocale={locale} />
            
            <div className="w-full px-4 py-6 h-full overflow-y-auto jotty-scrollable-content jotty-quick-nav-gutter">
                {children}
            </div>
        </Layout>
    );
};
