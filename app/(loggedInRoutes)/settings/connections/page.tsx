import { LinksTab } from "@/app/_components/FeatureComponents/Profile/Parts/LinksTab";
import { readLinkIndex } from "@/app/_server/actions/link";
import { getUsername } from "@/app/_server/actions/users";
import { getArchivedItems } from "@/app/_server/actions/archived";
import { getUserNotes } from "@/app/_server/actions/note";
import { getUserChecklists } from "@/app/_server/actions/checklist";
import { filterArchivedLinkIndex } from "@/app/_components/FeatureComponents/Profile/Parts/ConnectionsGraph/graph-data";

export default async function ConnectionsPage() {
    const username = await getUsername();
    const [linkIndex, archivedResult, notesResult, checklistsResult] = await Promise.all([
        readLinkIndex(username),
        getArchivedItems(),
        getUserNotes({ username, metadataOnly: true }),
        getUserChecklists({ username, metadataOnly: true }),
    ]);

    const archivedItems = archivedResult.success ? archivedResult.data : [];
    const filteredLinkIndex = filterArchivedLinkIndex(linkIndex, archivedItems || []);
    const notes = notesResult.success ? notesResult.data || [] : [];
    const checklists = checklistsResult.success ? checklistsResult.data || [] : [];

    return <LinksTab linkIndex={filteredLinkIndex} notes={notes} checklists={checklists} />;
}
