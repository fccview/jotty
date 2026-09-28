import { SettingsClient } from "@/app/_components/FeatureComponents/Settings/SettingsClient";
import { getCategories } from "@/app/_server/actions/category";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";

export default async function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [checklistCategories, noteCategories, user] = await Promise.all([
        getCategories(Modes.CHECKLISTS),
        getCategories(Modes.NOTES),
        getCurrentUser(),
    ]);

    const categories = [
        ...(checklistCategories.data || []),
        ...(noteCategories.data || []),
    ];

    return (
        <SettingsClient categories={categories} user={user}>
            {children}
        </SettingsClient>
    );
}
