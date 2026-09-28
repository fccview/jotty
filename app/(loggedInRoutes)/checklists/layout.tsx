import { ChecklistsClient } from "@/app/_components/FeatureComponents/Checklists/ChecklistsClient";
import { getCategories } from "@/app/_server/actions/category";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";

export default async function ChecklistsLayout({
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
    <ChecklistsClient categories={categories} user={user}>
      {children}
    </ChecklistsClient>
  );
}
