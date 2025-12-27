import { UserPreferencesTab } from "@/app/_components/FeatureComponents/Profile/Parts/UserPreferencesTab";
import { getCategories } from "@/app/_server/actions/category";
import { Modes } from "@/app/_types/enums";

export default async function UserPreferencesPage() {
    const notesCategoriesResult = await getCategories(Modes.NOTES);
    const notesCategories = notesCategoriesResult.success ? notesCategoriesResult.data : [];

    return <UserPreferencesTab noteCategories={notesCategories || []} />;
}
