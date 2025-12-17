import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import {
  Orbit01Icon,
  Add01Icon,
  PencilEdit02Icon,
  Delete03Icon,
} from "hugeicons-react";
import { FormWrapper } from "@/app/_components/GlobalComponents/FormElements/FormWrapper";
import { useEmojis } from "@/app/_hooks/useEmojis";

export const EmojiManager = () => {
  const {
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
  } = useEmojis();

  return (
    <>
      <FormWrapper
        title="Custom Emojis"
        action={
          <Button
            onClick={handleCreateEmoji}
            disabled={isLoadingEmojis}
            size="sm"
          >
            <Add01Icon className="mr-2 h-3 w-3" />
            Add Emoji
          </Button>
        }
        contentMaxHeight="300px"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {getCustomEmojis().map((emoji) => (
            <div
              key={emoji.keyword}
              className="flex items-center justify-between p-2 border border-border rounded-jotty bg-muted/30 text-sm"
            >
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <span className="text-base">{emoji.emoji}</span>
                <span className="text-muted-foreground truncate">
                  {emoji.keyword}
                </span>
              </div>
              <div className="flex items-center space-x-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditEmoji(emoji.keyword)}
                  className="h-6 w-6 p-0"
                >
                  <PencilEdit02Icon className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteEmoji(emoji.keyword)}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                >
                  <Delete03Icon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {getCustomEmojis().length === 0 && !isLoadingEmojis && (
            <p className="text-sm text-muted-foreground col-span-full text-center py-4">
              No custom emojis created yet. Click &quot;Add Emoji&quot; to get
              started.
            </p>
          )}
          {isLoadingEmojis && (
            <div className="col-span-full flex items-center justify-center py-4">
              <Orbit01Icon className="h-4 w-4 animate-spin" />
            </div>
          )}
        </div>
      </FormWrapper>

      <Modal
        isOpen={emojiModalOpen}
        onClose={() => setEmojiModalOpen(false)}
        title={editingEmoji ? "Edit Emoji" : "Add Emoji"}
        className="!w-full max-w-md"
      >
        <div className="space-y-4">
          <Input
            id="emojiKeyword"
            label="Keyword"
            type="text"
            value={emojiForm.keyword}
            onChange={(e) => handleEmojiFormChange("keyword", e.target.value)}
            placeholder="meeting"
            disabled={isSavingEmojis}
          />

          <div className="space-y-2">
            <label htmlFor="emojiEmoji" className="text-sm font-medium">
              Emoji
            </label>
            <div className="flex space-x-2">
              <Input
                id="emojiEmoji"
                type="text"
                value={emojiForm.emoji}
                onChange={(e) => handleEmojiFormChange("emoji", e.target.value)}
                placeholder="🤝"
                disabled={isSavingEmojis}
                className="flex-1"
              />
              <div className="flex items-center px-3 py-2 border border-border rounded-jotty bg-muted/30 text-lg">
                {emojiForm.emoji || "🤝"}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter any emoji or use emoji picker (Win: Win+.; Mac:
              Ctrl+Cmd+Space)
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setEmojiModalOpen(false)}
              disabled={isSavingEmojis}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEmoji} disabled={isSavingEmojis}>
              {isSavingEmojis ? (
                <>
                  <Orbit01Icon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingEmoji ? (
                "Update Emoji"
              ) : (
                "Add Emoji"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
