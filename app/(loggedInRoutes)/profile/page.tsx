import { UserProfileClient } from "@/app/_components/FeatureComponents/Profile/UserProfileClient";
import { isAdmin, getUsername } from "@/app/_server/actions/users";
import { getLoginType } from "@/app/_server/actions/session";
import { getArchivedItems } from "@/app/_server/actions/archived";
import { getCategories } from "@/app/_server/actions/category";
import { readLinkIndex, LinkIndex } from "@/app/_server/actions/link";
import { Modes } from "@/app/_types/enums";

export default async function ProfilePage() {
  const admin = await isAdmin();
  const loginType = await getLoginType();
  const isSsoUser = loginType === "sso";
  const username = await getUsername();

  const [archivedResult, listsCategoriesResult, notesCategoriesResult, linkIndex] =
    await Promise.all([
      getArchivedItems(),
      getCategories(Modes.CHECKLISTS),
      getCategories(Modes.NOTES),
      readLinkIndex(username),
    ]);

  const archivedItems = archivedResult.success ? archivedResult.data : [];
  const listsCategories = listsCategoriesResult.success
    ? listsCategoriesResult.data
    : [];
  const notesCategories = notesCategoriesResult.success
    ? notesCategoriesResult.data
    : [];

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

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <UserProfileClient
        isAdmin={admin}
        isSsoUser={isSsoUser}
        archivedItems={archivedItems || []}
        listsCategories={listsCategories || []}
        notesCategories={notesCategories || []}
        linkIndex={filteredLinkIndex}
      />
    </div>
  );
}
