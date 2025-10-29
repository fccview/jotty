"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ListTodo } from "lucide-react";
import { updateList } from "@/app/_server/actions/checklist";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Category } from "@/app/_types";
import { buildCategoryPath } from "@/app/_utils/global-utils";
import { ARCHIVED_DIR_NAME } from "@/app/_consts/files";

interface EditChecklistModalProps {
  checklist: {
    id: string;
    title: string;
    category?: string;
    owner?: string;
    isShared?: boolean;
  };
  categories: Category[];
  onClose: () => void;
  onUpdated: () => void;
  unarchive?: boolean;
}

export const EditChecklistModal = ({
  checklist,
  categories,
  onClose,
  onUpdated,
  unarchive,
}: EditChecklistModalProps) => {
  const router = useRouter();
  const [title, setTitle] = useState(checklist.title);
  const initialCategory = unarchive ? "" : checklist.category || "";
  const [category, setCategory] = useState(initialCategory);
  const [isLoading, setIsLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const checkOwnership = async () => {
      try {
        const user = await getCurrentUser();
        setIsOwner(user?.username === checklist.owner);
      } catch (error) {
        console.error("Error checking ownership:", error);
      }
    };
    checkOwnership();
  }, [checklist.owner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("id", checklist.id);
    formData.append("title", title.trim());
    formData.append("originalCategory", checklist.category || "Uncategorized");
    formData.append("unarchive", unarchive ? "true" : "false");

    if (isOwner) {
      formData.append("category", category || "");
    }
    const result = await updateList(formData);
    setIsLoading(false);

    if (result.success && result.data) {
      const updatedChecklist = result.data;

      const categoryPath = buildCategoryPath(
        updatedChecklist.category || "Uncategorized",
        updatedChecklist.id
      );

      if (!unarchive) {
        router.push(`/checklist/${categoryPath}`);
      }

      onUpdated();
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={unarchive ? "Unarchive Checklist" : "Edit Checklist"}
      titleIcon={<ListTodo className="h-5 w-5 text-primary" />}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={unarchive ? "hidden" : ""}>
          <label className="block text-sm font-medium text-foreground mb-2">
            Checklist Name *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter checklist name..."
            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            required
            disabled={isLoading || unarchive}
          />
        </div>

        {unarchive && (
          <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        )}

        {isOwner && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <CategoryTreeSelector
              categories={categories}
              selectedCategory={category}
              onCategorySelect={setCategory}
              className="w-full"
              isInModal={true}
            />
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="flex-1"
          >
            {isLoading
              ? "Updating..."
              : unarchive
              ? "Unarchive Checklist"
              : "Update Checklist"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
