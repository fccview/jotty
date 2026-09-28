import { TasksClient } from "@/app/_components/FeatureComponents/Checklists/TasksClient";
import { getCategories } from "@/app/_server/actions/category";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";

export default async function TasksLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [checklistCategories, user] = await Promise.all([
        getCategories(Modes.CHECKLISTS),
        getCurrentUser(),
    ]);

    const categories = checklistCategories.data || [];

    return (
        <TasksClient categories={categories} user={user}>
            {children}
        </TasksClient>
    );
}
