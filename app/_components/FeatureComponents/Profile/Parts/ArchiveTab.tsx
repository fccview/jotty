"use client";

import { useState, useEffect } from "react";
import {
  Category,
  Checklist,
  Note,
  User,
  User as UserType,
} from "@/app/_types";
import { getLists } from "@/app/_server/actions/checklist";
import { getNotes } from "@/app/_server/actions/note";
import { ARCHIVED_DIR_NAME } from "@/app/_consts/files";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { EditChecklistModal } from "@/app/_components/GlobalComponents/Modals/ChecklistModals/EditChecklistModal";
import { getCategories } from "@/app/_server/actions/category";
import { Modes } from "@/app/_types/enums";
import { useRouter } from "next/navigation";
import { EditNoteModal } from "@/app/_components/GlobalComponents/Modals/NotesModal/EditNoteModal";

interface ArchiveTabProps {
  user: User | null;
}

export const ArchiveTab = ({ user }: ArchiveTabProps) => {
  const [allLists, setAllLists] = useState<Checklist[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [listsCategories, setListsCategories] = useState<Category[]>([]);
  const [notesCategories, setNotesCategories] = useState<Category[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [selectedList, setSelectedList] = useState<Checklist | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const router = useRouter();
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        const listsResult = await getLists(user?.username, true);
        const listsCategoriesResult = await getCategories(Modes.CHECKLISTS);
        if (listsCategoriesResult.success && listsCategoriesResult.data) {
          setListsCategories(listsCategoriesResult.data);
        }
        if (listsResult.success && listsResult.data) {
          setAllLists(
            listsResult.data.filter(
              (list) => list.category === ARCHIVED_DIR_NAME
            )
          );
        }

        const notesResult = await getNotes(user?.username);
        const notesCategoriesResult = await getCategories(Modes.NOTES);
        if (notesCategoriesResult.success && notesCategoriesResult.data) {
          setNotesCategories(notesCategoriesResult.data);
        }
        if (notesResult.success && notesResult.data) {
          setAllNotes(
            notesResult.data.filter(
              (note) => note.category === ARCHIVED_DIR_NAME
            )
          );
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="md:flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Archived Content
          </h2>
        </div>
      </div>

      {allLists.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground mb-2">
            Checklists
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allLists.map((list) => {
              return (
                <ChecklistCard
                  key={list.id}
                  list={list}
                  onSelect={() => {
                    setSelectedList(list);
                    setShowEditModal(true);
                  }}
                />
              );
            })}
          </div>
          {showEditModal && (
            <EditChecklistModal
              checklist={selectedList as unknown as Checklist}
              categories={listsCategories}
              onClose={() => setShowEditModal(false)}
              onUpdated={() => {
                setShowEditModal(false);
                router.refresh();
              }}
            />
          )}
        </div>
      )}

      {allNotes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground mb-2">Notes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allNotes.map((note) => {
              return (
                <NoteCard
                  key={note.id}
                  note={note}
                  onSelect={() => {
                    setSelectedNote(note);
                    setShowEditNoteModal(true);
                  }}
                />
              );
            })}
          </div>
          {showEditNoteModal && (
            <EditNoteModal
              note={selectedNote as unknown as Note}
              categories={notesCategories}
              onClose={() => setShowEditNoteModal(false)}
              onUpdated={() => {
                setShowEditNoteModal(false);
                router.refresh();
              }}
            />
          )}
        </div>
      )}

      {allLists.length === 0 && allNotes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No archived content found</p>
        </div>
      )}
    </div>
  );
};
