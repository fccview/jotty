"use client";

import { useState, useMemo } from "react";
import { Category, User, Checklist, Note } from "@/app/_types";
import { useRouter } from "next/navigation";
import { EditNoteModal } from "@/app/_components/GlobalComponents/Modals/NotesModal/EditNoteModal";
import { EditChecklistModal } from "@/app/_components/GlobalComponents/Modals/ChecklistModals/EditChecklistModal";
import { ArchivedItem } from "@/app/_server/actions/archived";
import { ArchivedItemCard } from "@/app/_components/GlobalComponents/Cards/ArchivedItemCard";
import {
  Search01Icon,
  MultiplicationSignIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkSquare04Icon,
  File02Icon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { ItemTypes } from "@/app/_types/enums";
import { useTranslations } from "next-intl";

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
  const t = useTranslations();
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [showEditChecklistModal, setShowEditChecklistModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ArchivedItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChecklists, setShowChecklists] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const router = useRouter();

  const handleUnarchive = (item: ArchivedItem) => {
    setSelectedItem(item);

    if (item.type === ItemTypes.CHECKLIST) {
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
        ? item.title.toLowerCase().includes(searchQuery.toLowerCase())
        : false;
      return matchesSearch;
    });
  }, [archivedItems, searchQuery]);

  const archivedChecklists = useMemo(
    () => filteredItems.filter((item) => item.type === ItemTypes.CHECKLIST),
    [filteredItems]
  );

  const archivedNotes = useMemo(
    () => filteredItems.filter((item) => item.type === ItemTypes.NOTE),
    [filteredItems]
  );

  return (
    <div className="space-y-6">
      <div className="md:flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t('profile.archivedContent')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('profile.archivedItemsCount', { archivedItemsCount: archivedItems.length })}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search01Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
        <Input
          id="searchArchive"
          name="searchArchive"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("checklists.searchArchivedItems")}
          className="pl-10 pr-10 !space-y-0 [&>label]:hidden"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
          >
            <MultiplicationSignIcon className="h-3 w-3" />
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
                  <CheckmarkSquare04Icon className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium text-foreground">{t('checklists.title')}</h3>
                  <span className="text-sm text-muted-foreground">
                    ({archivedChecklists.length})
                  </span>
                </div>
                {showChecklists ? (
                  <ArrowUp01Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                  <ArrowDown01Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
                  <File02Icon className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium text-foreground">{t('notes.title')}</h3>
                  <span className="text-sm text-muted-foreground">
                    ({archivedNotes.length})
                  </span>
                </div>
                {showNotes ? (
                  <ArrowUp01Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                  <ArrowDown01Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
                {t('profile.noArchivedItemsFound', { searchQuery })}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('profile.noArchivedContent')}</p>
        </div>
      )}

      {showEditChecklistModal &&
        selectedItem &&
        selectedItem.type === ItemTypes.CHECKLIST && (
          <EditChecklistModal
            checklist={selectedItem.data as Checklist}
            categories={listsCategories}
            onClose={handleModalClose}
            onUpdated={handleUpdated}
            unarchive
          />
        )}

      {showEditNoteModal &&
        selectedItem &&
        selectedItem.type === ItemTypes.NOTE && (
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
