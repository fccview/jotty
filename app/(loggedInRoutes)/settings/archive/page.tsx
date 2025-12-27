import { ArchiveTab } from "@/app/_components/FeatureComponents/Profile/Parts/ArchiveTab";
import { getArchivedItems } from "@/app/_server/actions/archived";
import { getCategories } from "@/app/_server/actions/category";
import { Modes } from "@/app/_types/enums";

export default async function ArchivePage() {
    const [archivedResult, listsCategoriesResult, notesCategoriesResult] =
        await Promise.all([
            getArchivedItems(),
            getCategories(Modes.CHECKLISTS),
            getCategories(Modes.NOTES),
        ]);

    const archivedItems = archivedResult.success ? archivedResult.data : [];
    const listsCategories = listsCategoriesResult.success
        ? listsCategoriesResult.data
        : [];
    const notesCategories = notesCategoriesResult.success
        ? notesCategoriesResult.data
        : [];

    return (
        <ArchiveTab
            user={null}
            archivedItems={archivedItems || []}
            listsCategories={listsCategories || []}
            notesCategories={notesCategories || []}
        />
    );
}
