"use client";

import { Plus, FileText, FolderOpen } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Note, Category } from "@/app/_types";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { StatCard } from "@/app/_components/GlobalComponents/Cards/StatCard";
import Masonry from "react-masonry-css";

interface NotesHomeProps {
  notes: Note[];
  categories: Category[];
  onCreateModal: () => void;
  onSelectNote: (note: Note) => void;
}

export const NotesHome = ({
  notes,
  categories,
  onCreateModal,
  onSelectNote,
}: NotesHomeProps) => {
  const recentDocs = [...notes]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 12);

  const totalCategories = categories.length;

  const breakpointColumnsObj = {
    default: 3,
    1600: 4,
    1599: 3,
    1280: 2,
    1024: 2,
    768: 1,
    640: 1,
  };

  if (notes.length === 0) {
    return (
      <div className="flex-1 overflow-auto bg-background h-full">
        <EmptyState
          icon={<FileText className="h-10 w-10 text-muted-foreground" />}
          title="No notes yet"
          description="Create your first note to get started with your knowledge base."
          buttonText="Create New Note"
          onButtonClick={() => onCreateModal()}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background h-full">
      <div className="max-w-full pt-6 pb-4 px-4 lg:pt-8 lg:pb-8 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
              Notes
            </h1>
            <p className="text-lg text-muted-foreground">
              Your notes to store your ideas, thoughts, and knowledge.
            </p>
          </div>
          <Button onClick={() => onCreateModal()} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            New Note
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            icon={<FileText className="h-6 w-6 text-primary" />}
            title="Total Notes"
            value={notes.length}
          />
          <StatCard
            icon={<FolderOpen className="h-6 w-6 text-primary" />}
            title="Categories"
            value={totalCategories}
          />
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            Recent Notes
          </h2>
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="flex w-auto -ml-6"
            columnClassName="pl-6 bg-clip-padding"
          >
            {recentDocs.map((doc) => (
              <div key={doc.id} className="mb-6">
                <NoteCard note={doc} onSelect={onSelectNote} />
              </div>
            ))}
          </Masonry>
        </div>

        {notes.length > 12 && (
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Showing {recentDocs.length} of {notes.length} notes. Use the
              sidebar to browse all or search above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
