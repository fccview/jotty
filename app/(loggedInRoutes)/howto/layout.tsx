import { HowtoClient } from "@/app/_components/FeatureComponents/Howto/HowtoClient";
import { getCategories } from "@/app/_server/actions/category";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";

export default async function HowtoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [checklistCategories, noteCategories, userRecord] = await Promise.all([
        getCategories(Modes.CHECKLISTS),
        getCategories(Modes.NOTES),
        getCurrentUser(),
    ]);

    const categories = [
        ...(checklistCategories.data || []),
        ...(noteCategories.data || []),
    ];
    const user = sanitizeUserForClient(userRecord);

    return (
        <HowtoClient categories={categories} user={user}>
            {children}
        </HowtoClient>
    );
}
