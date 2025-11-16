"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ListTodo } from "lucide-react";
import { getListById, updateList } from "@/app/_server/actions/checklist";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Category, Checklist } from "@/app/_types";
import { buildCategoryPath } from "@/app/_utils/global-utils";
import { useTranslations } from "next-intl";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";

interface EditChecklistModalProps {
  checklist: Checklist;
  categories: Category[];
  onClose: () => void;
  onUpdated: () => void;
  unarchive?: boolean;
}

export const EditChecklistModal = ({
  checklist: initialChecklist,
  categories,
  onClose,
  onUpdated,
  unarchive,
}: EditChecklistModalProps) => {
  const router = useRouter();
  const { user } = useAppMode();
  const [title, setTitle] = useState(initialChecklist.title);
  const initialCategory = unarchive ? "" : initialChecklist.category || "";
  const [category, setCategory] = useState(initialCategory);
  const [isLoading, setIsLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const t = useTranslations();
  const [checklist, setChecklist] = useState<Checklist | null>(null);

  useEffect(() => {
    const fetchChecklist = async () => {
      const checklist = await getListById(
        initialChecklist.id,
        user?.username || "",
        initialChecklist.category || "Uncategorized"
      );
      const parsedChecklist = parseChecklistContent(
        checklist?.rawContent || "",
        checklist?.id || ""
      );

      setChecklist(checklist || null);
      setTitle(parsedChecklist?.title || "");
      setIsOwner(user?.username === checklist?.owner);
    };
    fetchChecklist();
  }, [initialChecklist]);

  if (!checklist) {
    return (
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Checklist not found"
        titleIcon={<ListTodo className="h-5 w-5 text-primary" />}
      >
        <p>Checklist not found</p>
      </Modal>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("id", initialChecklist.id);
    formData.append("title", title.trim());
    formData.append(
      "originalCategory",
      initialChecklist.category || "Uncategorized"
    );
    formData.append("unarchive", unarchive ? "true" : "false");

    if (isOwner) {
      formData.append("category", category || "");
    } else if (unarchive) {
      formData.append("category", category || "Uncategorized");
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
      title={unarchive ? "Unarchive Checklist" : t("checklists.edit_checklist")}
      titleIcon={<ListTodo className="h-5 w-5 text-primary" />}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={unarchive ? "hidden" : ""}>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t("checklists.checklist_name")} *
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
              {t("global.category")}
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
            {t("global.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="flex-1"
          >
            {isLoading
              ? `${t("global.updating")}...`
              : unarchive
              ? "Unarchive Checklist"
              : t("checklists.update_checklist")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
