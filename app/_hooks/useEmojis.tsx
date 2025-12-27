import { useState, useEffect } from "react";
import { useToast } from "@/app/_providers/ToastProvider";
import { useTranslations } from "next-intl";
import {
  loadCustomEmojis,
  saveCustomEmojis,
} from "@/app/_server/actions/config";

interface EmojiFormData {
  keyword: string;
  emoji: string;
}

export const useEmojis = () => {
  const { showToast } = useToast();
  const t = useTranslations();

  const [emojis, setEmojis] = useState<Record<string, string>>({});
  const [isLoadingEmojis, setIsLoadingEmojis] = useState(true);
  const [isSavingEmojis, setIsSavingEmojis] = useState(false);
  const [emojiModalOpen, setEmojiModalOpen] = useState(false);
  const [editingEmoji, setEditingEmoji] = useState<string | null>(null);
  const [emojiForm, setEmojiForm] = useState<EmojiFormData>({
    keyword: "",
    emoji: "",
  });

  const loadEmojis = async () => {
    try {
      setIsLoadingEmojis(true);
      const config = await loadCustomEmojis();
      setEmojis(config["custom-emojis"] || {});
    } catch (error) {
      console.error("Error loading emojis:", error);
      showToast({
        type: "error",
        title: t("errors.loadError"),
        message: t("errors.failedToLoadCustomEmojis"),
      });
    } finally {
      setIsLoadingEmojis(false);
    }
  };

  useEffect(() => {
    loadEmojis();
  }, []);

  const handleCreateEmoji = () => {
    setEditingEmoji(null);
    setEmojiForm({ keyword: "", emoji: "" });
    setEmojiModalOpen(true);
  };

  const handleEditEmoji = (keyword: string) => {
    setEditingEmoji(keyword);
    setEmojiForm({
      keyword,
      emoji: emojis[keyword] || "",
    });
    setEmojiModalOpen(true);
  };

  const handleDeleteEmoji = async (keyword: string) => {
    try {
      const newEmojis = { ...emojis };
      delete newEmojis[keyword];

      const result = await saveCustomEmojis({ "custom-emojis": newEmojis });
      if (result.success) {
        setEmojis(newEmojis);
        showToast({
          type: "success",
          title: t("common.success"),
          message: t("errors.emojiDeletedSuccessfully"),
        });
      } else {
        showToast({
          type: "error",
          title: t("errors.deleteError"),
          message: result.error || t("errors.failedToDeleteEmoji"),
        });
      }
    } catch (error) {
      console.error("Error deleting emoji:", error);
      showToast({
        type: "error",
        title: t("errors.deleteError"),
        message: t("errors.failedToDeleteEmoji"),
      });
    }
  };

  const handleSaveEmoji = async () => {
    try {
      setIsSavingEmojis(true);

      if (!emojiForm.keyword.trim() || !emojiForm.emoji.trim()) {
        showToast({
          type: "error",
          title: t("errors.validationError"),
          message: t("errors.keywordAndEmojiRequired"),
        });
        return;
      }

      if (!editingEmoji && emojis[emojiForm.keyword.trim()]) {
        showToast({
          type: "error",
          title: t("errors.duplicateKeyword"),
          message: t("errors.keywordAlreadyExists"),
        });
        return;
      }

      const newEmojis = { ...emojis };

      if (editingEmoji && editingEmoji !== emojiForm.keyword.trim()) {
        delete newEmojis[editingEmoji];
      }

      newEmojis[emojiForm.keyword.trim()] = emojiForm.emoji.trim();

      const result = await saveCustomEmojis({ "custom-emojis": newEmojis });
      if (result.success) {
        setEmojis(newEmojis);
        setEmojiModalOpen(false);
        showToast({
          type: "success",
          title: t("common.success"),
          message: editingEmoji
            ? t("errors.emojiUpdatedSuccessfully")
            : t("errors.emojiCreatedSuccessfully"),
        });
      } else {
        showToast({
          type: "error",
          title: t("errors.saveError"),
          message: result.error || t("errors.failedToSaveEmoji"),
        });
      }
    } catch (error) {
      console.error("Error saving emoji:", error);
      showToast({
        type: "error",
        title: t("errors.saveError"),
        message: t("errors.failedToSaveEmoji"),
      });
    } finally {
      setIsSavingEmojis(false);
    }
  };

  const handleEmojiFormChange = (field: keyof EmojiFormData, value: string) => {
    setEmojiForm((prev) => ({ ...prev, [field]: value }));
  };

  const getCustomEmojis = () => {
    return Object.entries(emojis).map(([keyword, emoji]) => ({
      keyword,
      emoji,
    }));
  };

  return {
    emojis,
    isLoadingEmojis,
    isSavingEmojis,
    emojiModalOpen,
    setEmojiModalOpen,
    editingEmoji,
    emojiForm,
    handleCreateEmoji,
    handleEditEmoji,
    handleDeleteEmoji,
    handleSaveEmoji,
    handleEmojiFormChange,
    getCustomEmojis,
  };
};
