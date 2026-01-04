import { TasksClient } from "@/app/_components/FeatureComponents/Checklists/TasksClient";
import { getCategories } from "@/app/_server/actions/category";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";

export default async function TasksLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [checklistCategories, userRecord] = await Promise.all([
        getCategories(Modes.CHECKLISTS),
        getCurrentUser(),
    ]);

    const categories = checklistCategories.data || [];
    const user = sanitizeUserForClient(userRecord);

    return (
        <TasksClient categories={categories} user={user}>
            {children}
        </TasksClient>
    );
}
