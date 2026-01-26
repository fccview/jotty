"use client";

import { Note } from "@/app/_types";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { useEffect } from "react";

declare global {
  interface Window {
    printReady?: boolean;
  }
}

interface PrintViewProps {
  note: Note;
}

export const PrintView = ({ note }: PrintViewProps) => {
  useEffect(() => {
    const timeout = setTimeout(() => {
      window.printReady = true;
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="bg-white min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-black mb-2">{note.title}</h1>
        {note.category && note.category !== "Uncategorized" && (
          <p className="text-gray-600 mb-1">{note.category}</p>
        )}
        <p className="text-gray-500 text-sm mb-8">
          Updated {new Date(note.updatedAt).toLocaleDateString()}
        </p>
        <div className="prose prose-sm max-w-none text-black">
          <UnifiedMarkdownRenderer content={note.content} forceLightMode />
        </div>
      </div>
    </div>
  );
};
