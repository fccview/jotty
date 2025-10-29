"use client";

import { useState, useMemo } from "react";
import { Category, User, Checklist, Note } from "@/app/_types";
import { useRouter } from "next/navigation";
import { EditNoteModal } from "@/app/_components/GlobalComponents/Modals/NotesModal/EditNoteModal";
import { EditChecklistModal } from "@/app/_components/GlobalComponents/Modals/ChecklistModals/EditChecklistModal";
import { ArchivedItem } from "@/app/_server/actions/archived";
import { ArchivedItemCard } from "@/app/_components/GlobalComponents/Cards/ArchivedItemCard";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ListTodo,
  FileText,
} from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";

interface ArchiveTabProps {
  user: User | null;
  archivedItems: ArchivedItem[];
  listsCategories: Category[];
  notesCategories: Category[];
}

export const ArchiveTab = ({
  user,
  archivedItems,
  listsCategories,
  notesCategories,
}: ArchiveTabProps) => {
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [showEditChecklistModal, setShowEditChecklistModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ArchivedItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChecklists, setShowChecklists] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const router = useRouter();

  const handleUnarchive = (item: ArchivedItem) => {
    setSelectedItem(item);
    if (item.type === "checklist") {
      setShowEditChecklistModal(true);
    } else {
      setShowEditNoteModal(true);
    }
  };

  const handleModalClose = () => {
    setShowEditChecklistModal(false);
    setShowEditNoteModal(false);
    setSelectedItem(null);
  };

  const handleUpdated = () => {
    handleModalClose();
    router.refresh();
  };

  const filteredItems = useMemo(() => {
    return archivedItems.filter((item) => {
      const matchesSearch = item.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [archivedItems, searchQuery]);

  const archivedChecklists = useMemo(
    () => filteredItems.filter((item) => item.type === "checklist"),
    [filteredItems]
  );

  const archivedNotes = useMemo(
    () => filteredItems.filter((item) => item.type === "note"),
    [filteredItems]
  );

  return (
    <div className="space-y-6">
      <div className="md:flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Archived Content
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {archivedItems.length}{" "}
            {archivedItems.length === 1 ? "item" : "items"} archived
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search archived items..."
          className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {archivedItems.length > 0 ? (
        <>
          {archivedChecklists.length > 0 && (
            <div className="space-y-4">
              <button
                onClick={() => setShowChecklists(!showChecklists)}
                className="flex items-center justify-between w-full text-left group"
              >
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium text-foreground">
                    Checklists
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    ({archivedChecklists.length})
                  </span>
                </div>
                {showChecklists ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </button>

              {showChecklists && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {archivedChecklists.map((item) => (
                    <ArchivedItemCard
                      key={item.id}
                      item={item}
                      onUnarchive={handleUnarchive}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {archivedNotes.length > 0 && (
            <div className="space-y-4">
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center justify-between w-full text-left group"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium text-foreground">Notes</h3>
                  <span className="text-sm text-muted-foreground">
                    ({archivedNotes.length})
                  </span>
                </div>
                {showNotes ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </button>

              {showNotes && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {archivedNotes.map((item) => (
                    <ArchivedItemCard
                      key={item.id}
                      item={item}
                      onUnarchive={handleUnarchive}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {filteredItems.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No archived items found matching &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No archived content found</p>
        </div>
      )}

      {showEditChecklistModal &&
        selectedItem &&
        selectedItem.type === "checklist" && (
          <EditChecklistModal
            checklist={selectedItem.data as Checklist}
            categories={listsCategories}
            onClose={handleModalClose}
            onUpdated={handleUpdated}
            unarchive
          />
        )}

      {showEditNoteModal && selectedItem && selectedItem.type === "note" && (
        <EditNoteModal
          note={selectedItem.data as Note}
          categories={notesCategories}
          onClose={handleModalClose}
          onUpdated={handleUpdated}
          unarchive
        />
      )}
    </div>
  );
};
