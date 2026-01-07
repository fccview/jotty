"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getListById, updateList } from "@/app/_server/actions/checklist";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Category, Checklist } from "@/app/_types";
import { buildCategoryPath } from "@/app/_utils/global-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { useTranslations } from "next-intl";

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
  const t = useTranslations();
  const router = useRouter();
  const { user } = useAppMode();
  const [title, setTitle] = useState(initialChecklist.title);
  const initialCategory = unarchive ? "" : initialChecklist.category || "";
  const [category, setCategory] = useState(initialCategory);
  const [isLoading, setIsLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
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
      <Modal isOpen={true} onClose={onClose} title={t("checklists.checklistNotFound")}>
        <p>{t("checklists.checklistNotFound")}</p>
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
      title={unarchive ? t("checklists.unarchiveChecklist") : t("checklists.editChecklist")}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={unarchive ? "hidden" : ""}>
          <Input
            id="checklistName"
            name="checklistName"
            label={`${t("checklists.checklistName")} *`}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("checklists.enterChecklistName")}
            required
            disabled={isLoading || unarchive}
            autoFocus
          />
        </div>

        {unarchive && (
          <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        )}

        {isOwner && (
          <div>
            <label className="block text-md lg:text-sm font-medium text-foreground mb-2">{t('notes.category')}</label>
            <CategoryTreeSelector
              categories={categories}
              selectedCategory={category}
              onCategorySelect={setCategory}
              className="w-full"
              placeholder={t('common.selectCategory')}
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
          >{t('common.cancel')}</Button>
          <Button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="flex-1"
          >
            {isLoading
              ? t("checklists.updating")
              : unarchive
                ? t("checklists.unarchiveChecklist")
                : t("checklists.updateChecklist")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
