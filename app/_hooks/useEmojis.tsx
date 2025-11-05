import { useState, useEffect } from "react";
import { useToast } from "@/app/_providers/ToastProvider";
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
        title: "Load Error",
        message: "Failed to load custom emojis",
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
          title: "Success",
          message: "Emoji deleted successfully",
        });
      } else {
        showToast({
          type: "error",
          title: "Delete Error",
          message: result.error || "Failed to delete emoji",
        });
      }
    } catch (error) {
      console.error("Error deleting emoji:", error);
      showToast({
        type: "error",
        title: "Delete Error",
        message: "Failed to delete emoji",
      });
    }
  };

  const handleSaveEmoji = async () => {
    try {
      setIsSavingEmojis(true);

      if (!emojiForm.keyword.trim() || !emojiForm.emoji.trim()) {
        showToast({
          type: "error",
          title: "Validation Error",
          message: "Keyword and emoji are required",
        });
        return;
      }

      // Check if keyword already exists (when creating new)
      if (!editingEmoji && emojis[emojiForm.keyword.trim()]) {
        showToast({
          type: "error",
          title: "Duplicate Keyword",
          message: "Keyword already exists",
        });
        return;
      }

      const newEmojis = { ...emojis };

      // Remove old keyword if editing
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
          title: "Success",
          message: editingEmoji
            ? "Emoji updated successfully"
            : "Emoji created successfully",
        });
      } else {
        showToast({
          type: "error",
          title: "Save Error",
          message: result.error || "Failed to save emoji",
        });
      }
    } catch (error) {
      console.error("Error saving emoji:", error);
      showToast({
        type: "error",
        title: "Save Error",
        message: "Failed to save emoji",
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
