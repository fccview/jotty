import { Editor } from "@tiptap/react";
import {
  TextBoldIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  SourceCodeIcon,
  Heading02Icon,
  RightToLeftListTriangleIcon,
  LeftToRightListNumberIcon,
  QuoteUpIcon,
  Attachment01Icon,
  File02Icon,
  ViewIcon,
  ViewOffSlashIcon,
  Tv02Icon,
  TextUnderlineIcon,
  Image02Icon,
  LeftToRightListBulletIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { FileModal } from "@/app/_components/GlobalComponents/Modals/FilesModal/FileModal";
import { ImageSizeModal } from "@/app/_components/GlobalComponents/Modals/ImageSizeModal";
import { CodeBlockDropdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/CodeBlocksDropdown";
import { DiagramsDropdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/DiagramsDropdown";
import { TableInsertModal } from "@/app/_components/FeatureComponents/Notes/Parts/Table/TableInsertModal";
import { FontFamilyDropdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/FontFamilyDropdown";
import { useState } from "react";
import { cn } from "@/app/_utils/global-utils";
import { ExtraItemsDropdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/ExtraItemsDropdown";
import { PrismThemeDropdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/PrismThemeDropdown";
import { useTranslations } from "next-intl";
import { PromptModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/PromptModal";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import * as MarkdownUtils from "@/app/_utils/markdown-editor-utils";
import { insertTextAtCursor } from "@/app/_utils/markdown-editor-utils";

type ToolbarProps = {
  editor: Editor | null;
  isMarkdownMode: boolean;
  toggleMode: () => void;
  showLineNumbers?: boolean;
  onToggleLineNumbers?: () => void;
  showPreview?: boolean;
  onTogglePreview?: () => void;
  markdownContent?: string;
  onMarkdownChange?: (content: string) => void;
};

export const TiptapToolbar = ({
  editor,
  isMarkdownMode,
  toggleMode,
  showLineNumbers = true,
  onToggleLineNumbers,
  showPreview = false,
  onTogglePreview,
  markdownContent = "",
  onMarkdownChange,
}: ToolbarProps) => {
  const t = useTranslations();
  const { user } = useAppMode();
  const [showFileModal, setShowFileModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showImageSizeModal, setShowImageSizeModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showLinkTextModal, setShowLinkTextModal] = useState(false);
  const [previousUrl, setPreviousUrl] = useState("");
  const [pendingLinkUrl, setPendingLinkUrl] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
  const [selectedImageWidth, setSelectedImageWidth] = useState<
    number | undefined
  >();
  const [selectedImageHeight, setSelectedImageHeight] = useState<
    number | undefined
  >();

  if (!editor) {
    return null;
  }

  const setLink = () => {
    if (isMarkdownMode) {
      const textarea = getMarkdownTextarea();
      const hasSelection = textarea && textarea.selectionStart !== textarea.selectionEnd;

      if (hasSelection) {
        setPreviousUrl("");
        setShowLinkModal(true);
      } else {
        setShowLinkTextModal(true);
      }
    } else {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (hasSelection) {
        const currentUrl = editor.getAttributes("link").href;
        setPreviousUrl(currentUrl || "");
        setShowLinkModal(true);
      } else {
        setShowLinkTextModal(true);
      }
    }
  };

  const confirmLinkText = (text: string) => {
    if (text) {
      setShowLinkModal(true);
      if (isMarkdownMode) {
        const textarea = getMarkdownTextarea();
        if (textarea) {
          const { start } = MarkdownUtils.getTextareaSelection(textarea);
          textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(start);
          textarea.setSelectionRange(start, start + text.length);
        }
      } else {
        editor.chain().focus().insertContent(text).run();
        const { from } = editor.state.selection;
        editor.commands.setTextSelection({ from: from - text.length, to: from });
      }
    }
  };

  const confirmSetLink = (url: string) => {
    if (isMarkdownMode) {
      handleMarkdownButtonClick((textarea) => MarkdownUtils.insertLink(textarea, url));
    } else {
      if (url === "") {
        editor.chain().focus().unsetLink().run();
        return;
      }
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleFileSelect = (
    url: string,
    type: "image" | "video" | "file",
    fileName?: string,
    mimeType?: string
  ) => {
    if (type === "image") {
      setSelectedImageUrl(url);
      setSelectedImageWidth(undefined);
      setSelectedImageHeight(undefined);
      setShowImageSizeModal(true);
    } else {
      const finalFileName = fileName || url.split("/").pop() || t("editor.defaultFileName");

      if (isMarkdownMode) {
        handleMarkdownButtonClick((textarea) => {
          if (type === "video") {
            return MarkdownUtils.insertVideo(textarea, url, finalFileName);
          } else {
            return MarkdownUtils.insertFile(textarea, url, finalFileName);
          }
        });
      } else {
        const finalMimeType = mimeType || "application/octet-stream";
        editor
          .chain()
          .focus()
          .setFileAttachment({
            url,
            fileName: finalFileName,
            mimeType: finalMimeType,
            type: type === "video" ? "video" : "file",
          })
          .run();
      }
    }
  };

  const handleImageSizeConfirm = (
    width: number | null,
    height: number | null
  ) => {
    if (selectedImageUrl) {
      if (isMarkdownMode) {
        const alt = selectedImageUrl.split("/").pop() || "image";
        let imageMarkdown = `![${alt}](${selectedImageUrl})`;

        if (width || height) {
          const widthAttr = width ? `width="${width}"` : "";
          const heightAttr = height ? `height="${height}"` : "";
          imageMarkdown = `<img src="${selectedImageUrl}" alt="${alt}" ${widthAttr} ${heightAttr} />`;
        }

        handleMarkdownButtonClick((textarea) => {
          return insertTextAtCursor(textarea, imageMarkdown, "", "", 0);
        });
      } else {
        const imageAttrs: any = { src: selectedImageUrl };

        if (width && width > 0) imageAttrs.width = width;
        if (height && height > 0) imageAttrs.height = height;

        editor.chain().focus().setImage(imageAttrs).run();
      }
    }
  };

  const handleImageSizeClose = () => {
    setShowImageSizeModal(false);
    setSelectedImageUrl("");
    setSelectedImageWidth(undefined);
    setSelectedImageHeight(undefined);
  };

  const isImageSelected = editor && editor.isActive("image");
  const selectedImageAttrs = editor ? editor.getAttributes("image") : {};

  const getMarkdownTextarea = (): HTMLTextAreaElement | null => {
    return document.getElementById("markdown-editor-textarea") as HTMLTextAreaElement;
  };

  const handleButtonClick = (command: () => void) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    command();
    editor.commands.setTextSelection({ from, to });
  };

  const handleMarkdownButtonClick = (markdownFn: (textarea: HTMLTextAreaElement) => string) => {
    const textarea = getMarkdownTextarea();
    if (textarea && onMarkdownChange) {
      const newContent = markdownFn(textarea);
      onMarkdownChange(newContent);
    }
  };

  const handleDualModeButton = (
    richCommand: () => void,
    markdownFn: (textarea: HTMLTextAreaElement) => string
  ) => {
    if (isMarkdownMode) {
      handleMarkdownButtonClick(markdownFn);
    } else {
      handleButtonClick(richCommand);
    }
  };

  return (
    <>
      <div
        className={cn(
          "bg-background flex w-full items-center lg:gap-4 px-0 lg:px-2 lg:py-2",
          isMarkdownMode ? "md:justify-end" : "md:justify-between"
        )}
      >
        <div className="flex-shrink-0 md:order-last flex items-center gap-1">
          {isMarkdownMode && onToggleLineNumbers && (
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onToggleLineNumbers}
              className="flex-shrink-0 hidden lg:flex"
              title={
                showLineNumbers ? t('editor.hideLineNumbers') : t('editor.showLineNumbers')
              }
            >
              {showLineNumbers ? (
                <RightToLeftListTriangleIcon className="h-4 w-4" />
              ) : (
                <LeftToRightListNumberIcon className="h-4 w-4" />
              )}
            </Button>
          )}
          {isMarkdownMode && (
            <div className="hidden lg:flex">
              <PrismThemeDropdown isMarkdownMode={isMarkdownMode} />
            </div>
          )}
          {isMarkdownMode && onTogglePreview && (
            <Button
              variant={showPreview ? "secondary" : "ghost"}
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onTogglePreview}
              className="flex-shrink-0 hidden lg:flex"
              title={showPreview ? t('editor.hidePreview') : t('editor.showPreview')}
            >
              {showPreview ? (
                <>
                  <ViewOffSlashIcon className="h-4 w-4 mr-2" />
                  <span>{t('editor.edit')}</span>
                </>
              ) : (
                <>
                  <ViewIcon className="h-4 w-4 mr-2" />
                  <span>{t('editor.preview')}</span>
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleMode}
            className="flex-shrink-0 hidden lg:flex"
            title={t('editor.toggleEditorMode')}
          >
            {isMarkdownMode ? (
              <>
                <Tv02Icon className="h-4 w-4 mr-2" />
                <span>{t('editor.richEditor')}</span>
              </>
            ) : (
              <>
                <File02Icon className="h-4 w-4 mr-2" />
                <span>{t('editor.markdown')}</span>
              </>
            )}
          </Button>
        </div>

        <div className={`fixed bottom-[130px] ${user?.handedness === "left-handed" ? "left-[2.5%]" : "right-[2.5%]"} lg:hidden z-40 flex flex-col gap-1 bg-background border border-border rounded-jotty p-1`}>
          {isMarkdownMode && onTogglePreview && (
            <Button
              variant={showPreview ? "default" : "ghost"}
              size="icon"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onTogglePreview}
              title={showPreview ? t('editor.hidePreview') : t('editor.showPreview')}
              className="h-10 w-10"
            >
              {showPreview ? (
                <ViewOffSlashIcon className="h-5 w-5" />
              ) : (
                <ViewIcon className="h-5 w-5" />
              )}
            </Button>
          )}
          <Button
            variant={!isMarkdownMode ? "default" : "ghost"}
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleMode}
            title={t('editor.toggleRichEditorMode')}
            className="h-10 w-10"
          >
            <Tv02Icon className="h-5 w-5" />
          </Button>

          <Button
            variant={isMarkdownMode ? "default" : "ghost"}
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleMode}
            title={t('editor.toggleMarkdownMode')}
            className="h-10 w-10"
          >
            <File02Icon className="h-5 w-5" />
          </Button>
        </div>

        <div
          className={cn(
            "flex flex-1 min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap md:flex-wrap md:whitespace-normal",
            "hide-scrollbar scroll-fade-right"
          )}
        >
          <Button
            variant={editor && editor.isActive("bold") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleDualModeButton(
                () => editor.chain().focus().toggleBold().run(),
                MarkdownUtils.insertBold
              )
            }
            title={t('editor.toggleBold')}
          >
            <TextBoldIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor && editor.isActive("italic") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleDualModeButton(
                () => editor.chain().focus().toggleItalic().run(),
                MarkdownUtils.insertItalic
              )
            }
            title={t('editor.toggleItalic')}
          >
            <TextItalicIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor && editor.isActive("underline") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleDualModeButton(
                () => editor.chain().focus().toggleUnderline().run(),
                MarkdownUtils.insertUnderline
              )
            }
            title={t('editor.toggleUnderline')}
          >
            <TextUnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor && editor.isActive("strike") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleDualModeButton(
                () => editor.chain().focus().toggleStrike().run(),
                MarkdownUtils.insertStrikethrough
              )
            }
            title={t('editor.toggleStrikethrough')}
          >
            <TextStrikethroughIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor && editor.isActive("code") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleDualModeButton(
                () => editor.chain().focus().toggleCode().run(),
                MarkdownUtils.insertInlineCode
              )
            }
            title={t('editor.toggleInlineCode')}
          >
            <SourceCodeIcon className="h-4 w-4" />
          </Button>
          {!isMarkdownMode && (
            <>
              <div className="w-px h-6 bg-border mx-2" />
              <FontFamilyDropdown editor={editor} />
              <div className="w-px h-6 bg-border mx-2" />
            </>
          )}
          <Button
            variant={
              editor && editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"
            }
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleDualModeButton(
                () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                (textarea) => MarkdownUtils.insertHeading(textarea, 2)
              )
            }
            title={t('editor.toggleHeading2')}
          >
            <Heading02Icon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor && editor.isActive("bulletList") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleDualModeButton(
                () => editor.chain().focus().toggleBulletList().run(),
                MarkdownUtils.insertBulletList
              )
            }
            title={t('editor.toggleBulletList')}
          >
            <LeftToRightListBulletIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor && editor.isActive("blockquote") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleDualModeButton(
                () => editor.chain().focus().toggleBlockquote().run(),
                MarkdownUtils.insertBlockquote
              )
            }
            title={t('editor.toggleBlockquote')}
          >
            <QuoteUpIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor && editor.isActive("link") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleButtonClick(setLink)}
            title={t('editor.toggleLink')}
          >
            <Attachment01Icon className="h-4 w-4" />
          </Button>
          {isImageSelected && !isMarkdownMode && (
            <Button
              variant="secondary"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setSelectedImageUrl(selectedImageAttrs.src || "");
                setSelectedImageWidth(selectedImageAttrs.width);
                setSelectedImageHeight(selectedImageAttrs.height);
                setShowImageSizeModal(true);
              }}
              title={t('editor.editImageSize')}
            >
              <Image02Icon className="h-4 w-4" />
            </Button>
          )}
          <div className="w-px h-6 bg-border mx-2" />
          <CodeBlockDropdown
            editor={editor}
            isMarkdownMode={isMarkdownMode}
            onMarkdownChange={onMarkdownChange}
          />
          <DiagramsDropdown
            editor={editor}
            isMarkdownMode={isMarkdownMode}
            onMarkdownChange={onMarkdownChange}
          />
          <div className="w-px h-6 bg-border mx-2" />
          <ExtraItemsDropdown
            editor={editor}
            isMarkdownMode={isMarkdownMode}
            onMarkdownChange={onMarkdownChange}
            onFileModalOpen={() => setShowFileModal(true)}
            onTableModalOpen={() => setShowTableModal(true)}
            onImageSizeModalOpen={(url) => {
              setSelectedImageUrl(url);
              setSelectedImageWidth(undefined);
              setSelectedImageHeight(undefined);
              setShowImageSizeModal(true);
            }}
          />
        </div>
      </div>

      <FileModal
        isOpen={showFileModal}
        onClose={() => setShowFileModal(false)}
        onSelectFile={handleFileSelect}
      />
      <TableInsertModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        editor={editor}
      />
      <ImageSizeModal
        isOpen={showImageSizeModal}
        onClose={handleImageSizeClose}
        onConfirm={handleImageSizeConfirm}
        currentWidth={selectedImageWidth}
        currentHeight={selectedImageHeight}
        imageUrl={selectedImageUrl}
      />

      <PromptModal
        isOpen={showLinkTextModal}
        onClose={() => setShowLinkTextModal(false)}
        onConfirm={confirmLinkText}
        title={t("editor.addLink")}
        message="Enter link text"
        placeholder="Link text"
        confirmText={t("common.continue")}
      />

      <PromptModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onConfirm={confirmSetLink}
        title={t("editor.addLink")}
        message={t("editor.enterURL")}
        placeholder="https://example.com"
        defaultValue={previousUrl}
        confirmText={t("common.confirm")}
      />
    </>
  );
};
