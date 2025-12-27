import { LinksTab } from "@/app/_components/FeatureComponents/Profile/Parts/LinksTab";
import { readLinkIndex, LinkIndex } from "@/app/_server/actions/link";
import { getUsername } from "@/app/_server/actions/users";
import { getArchivedItems } from "@/app/_server/actions/archived";

export default async function ConnectionsPage() {
    const username = await getUsername();
    const [linkIndex, archivedResult] = await Promise.all([
        readLinkIndex(username),
        getArchivedItems(),
    ]);

    const archivedItems = archivedResult.success ? archivedResult.data : [];

    const filterArchivedItems = (linkIndex: LinkIndex, archivedItems: any[]): LinkIndex => {
        const archivedIds = new Set(archivedItems.map(item => `${item.category || 'Uncategorized'}/${item.id}`));

        const filteredNotes = Object.fromEntries(
            Object.entries(linkIndex.notes).filter(([key]) => !archivedIds.has(key))
        );

        const filteredChecklists = Object.fromEntries(
            Object.entries(linkIndex.checklists).filter(([key]) => !archivedIds.has(key))
        );

        Object.keys(filteredNotes).forEach(noteKey => {
            filteredNotes[noteKey].isLinkedTo.notes = filteredNotes[noteKey].isLinkedTo.notes.filter(
                linkedKey => !archivedIds.has(linkedKey)
            );
            filteredNotes[noteKey].isLinkedTo.checklists = filteredNotes[noteKey].isLinkedTo.checklists.filter(
                linkedKey => !archivedIds.has(linkedKey)
            );
            filteredNotes[noteKey].isReferencedIn.notes = filteredNotes[noteKey].isReferencedIn.notes.filter(
                refKey => !archivedIds.has(refKey)
            );
            filteredNotes[noteKey].isReferencedIn.checklists = filteredNotes[noteKey].isReferencedIn.checklists.filter(
                refKey => !archivedIds.has(refKey)
            );
        });

        Object.keys(filteredChecklists).forEach(checklistKey => {
            filteredChecklists[checklistKey].isLinkedTo.notes = filteredChecklists[checklistKey].isLinkedTo.notes.filter(
                linkedKey => !archivedIds.has(linkedKey)
            );
            filteredChecklists[checklistKey].isLinkedTo.checklists = filteredChecklists[checklistKey].isLinkedTo.checklists.filter(
                linkedKey => !archivedIds.has(linkedKey)
            );
            filteredChecklists[checklistKey].isReferencedIn.notes = filteredChecklists[checklistKey].isReferencedIn.notes.filter(
                refKey => !archivedIds.has(refKey)
            );
            filteredChecklists[checklistKey].isReferencedIn.checklists = filteredChecklists[checklistKey].isReferencedIn.checklists.filter(
                refKey => !archivedIds.has(refKey)
            );
        });

        return { notes: filteredNotes, checklists: filteredChecklists };
    };

    const filteredLinkIndex = filterArchivedItems(linkIndex, archivedItems || []);

    return <LinksTab linkIndex={filteredLinkIndex} />;
}
