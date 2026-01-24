"use client";

import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import {
  Add01Icon,
  PencilEdit02Icon,
  Delete03Icon,
} from "hugeicons-react";
import { FormWrapper } from "@/app/_components/GlobalComponents/FormElements/FormWrapper";
import { useEmojis } from "@/app/_hooks/useEmojis";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { useTranslations } from "next-intl";

export const EmojiManager = () => {
  const t = useTranslations();
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
        title={t('admin.customEmojis')}
        action={
          <Button
            onClick={handleCreateEmoji}
            disabled={isLoadingEmojis}
            size="sm"
          >
            <Add01Icon className="mr-2 h-3 w-3" />
            {t('admin.addEmoji')}
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
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteEmoji(emoji.keyword)}
                  className="h-6 w-6 p-0"
                >
                  <Delete03Icon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {getCustomEmojis().length === 0 && !isLoadingEmojis && (
            <p className="text-md lg:text-sm text-muted-foreground col-span-full text-center py-4">
              {t('admin.noEmojisYet')}
            </p>
          )}
          {isLoadingEmojis && (
            <div className="col-span-full flex items-center justify-center py-4">
              <Logo className="h-4 w-4 mr-2 animate-pulse" />
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
            label={t('common.keyword')}
            type="text"
            value={emojiForm.keyword}
            onChange={(e) => handleEmojiFormChange("keyword", e.target.value)}
            placeholder={t('common.exampleKeyword')}
            disabled={isSavingEmojis}
          />

          <div className="space-y-2">
            <label htmlFor="emojiEmoji" className="text-md lg:text-sm font-medium">
              {t('common.emoji')}
            </label>
            <div className="flex space-x-2">
              <Input
                id="emojiEmoji"
                type="text"
                value={emojiForm.emoji}
                onChange={(e) => handleEmojiFormChange("emoji", e.target.value)}
                placeholder={t('common.exampleEmoji')}
                disabled={isSavingEmojis}
                className="flex-1"
              />
              <div className="flex items-center px-3 py-2 border border-border rounded-jotty bg-muted/30 text-lg">
                {emojiForm.emoji || t('common.exampleEmoji')}
              </div>
            </div>
            <p className="text-md lg:text-xs text-muted-foreground">
              {t('admin.enterAnyEmoji')}
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setEmojiModalOpen(false)}
              disabled={isSavingEmojis}
            >{t('common.cancel')}</Button>
            <Button onClick={handleSaveEmoji} disabled={isSavingEmojis}>
              {isSavingEmojis ? (
                <>
                  <Logo
                    className="h-4 w-4 bg-background mr-2 animate-pulse"
                    pathClassName="fill-primary"
                  />{t('common.saving')}</>
              ) : editingEmoji ? (
                t('common.update')
              ) : (
                t('common.add')
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
