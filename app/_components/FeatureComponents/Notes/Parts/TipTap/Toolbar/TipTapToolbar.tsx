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

type ToolbarProps = {
  editor: Editor | null;
  isMarkdownMode: boolean;
  toggleMode: () => void;
  showLineNumbers?: boolean;
  onToggleLineNumbers?: () => void;
  showPreview?: boolean;
  onTogglePreview?: () => void;
  markdownContent?: string;
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
}: ToolbarProps) => {
  const [showFileModal, setShowFileModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showImageSizeModal, setShowImageSizeModal] = useState(false);
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
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
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
      const finalFileName = fileName || url.split("/").pop() || "file";
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
  };

  const handleImageSizeConfirm = (
    width: number | null,
    height: number | null
  ) => {
    if (selectedImageUrl) {
      const imageAttrs: any = { src: selectedImageUrl };

      if (width && width > 0) imageAttrs.width = width;
      if (height && height > 0) imageAttrs.height = height;

      editor.chain().focus().setImage(imageAttrs).run();
    }
  };

  const handleImageSizeClose = () => {
    setShowImageSizeModal(false);
    setSelectedImageUrl("");
    setSelectedImageWidth(undefined);
    setSelectedImageHeight(undefined);
  };

  const isImageSelected = editor.isActive("image");
  const selectedImageAttrs = editor.getAttributes("image");

  const handleButtonClick = (command: () => void) => {
    const { from, to } = editor.state.selection;
    command();
    editor.commands.setTextSelection({ from, to });
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
                showLineNumbers ? "Hide line numbers" : "Show line numbers"
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
              title={showPreview ? "Hide preview" : "Show preview"}
            >
              {showPreview ? (
                <>
                  <ViewOffSlashIcon className="h-4 w-4 mr-2" />
                  <span>Edit</span>
                </>
              ) : (
                <>
                  <ViewIcon className="h-4 w-4 mr-2" />
                  <span>Preview</span>
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
            title="Toggle editor mode"
          >
            {isMarkdownMode ? (
              <>
                <Tv02Icon className="h-4 w-4 mr-2" />
                <span>Rich Editor</span>
              </>
            ) : (
              <>
                <File02Icon className="h-4 w-4 mr-2" />
                <span>Markdown</span>
              </>
            )}
          </Button>
        </div>

        <div className="fixed bottom-[62px] w-full left-0 lg:hidden z-40 bg-background">
          <div className="flex gap-1 p-2 border-b border-border w-full justify-center items-center">
            {isMarkdownMode && onTogglePreview && (
              <Button
                variant={showPreview ? "default" : "ghost"}
                className="w-1/3"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onTogglePreview}
                title={showPreview ? "Hide preview" : "Show preview"}
              >
                {showPreview ? (
                  <ViewOffSlashIcon className="h-4 w-4 mr-2" />
                ) : (
                  <ViewIcon className="h-4 w-4 mr-2" />
                )}
                <span>Preview</span>
              </Button>
            )}
            <Button
              variant={!isMarkdownMode ? "default" : "ghost"}
              className={isMarkdownMode && onTogglePreview ? "w-1/3" : "w-1/2"}
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleMode}
              title="Toggle rich editor mode"
            >
              <Tv02Icon className="h-4 w-4 mr-2" />
              <span>Rich Editor</span>
            </Button>

            <Button
              variant={isMarkdownMode ? "default" : "ghost"}
              className={isMarkdownMode && onTogglePreview ? "w-1/3" : "w-1/2"}
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleMode}
              title="Toggle markdown mode"
            >
              <File02Icon className="h-4 w-4 mr-2" />
              <span>Markdown</span>
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-1 min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap md:flex-wrap md:whitespace-normal",
            "hide-scrollbar scroll-fade-right",
            isMarkdownMode ? "hidden" : ""
          )}
        >
          <Button
            variant={editor.isActive("bold") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleButtonClick(() => editor.chain().focus().toggleBold().run())
            }
            title="Toggle bold"
          >
            <TextBoldIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive("italic") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleButtonClick(() =>
                editor.chain().focus().toggleItalic().run()
              )
            }
            title="Toggle italic"
          >
            <TextItalicIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive("underline") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleButtonClick(() =>
                editor.chain().focus().toggleUnderline().run()
              )
            }
            title="Toggle underline"
          >
            <TextUnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive("strike") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleButtonClick(() =>
                editor.chain().focus().toggleStrike().run()
              )
            }
            title="Toggle strikethrough"
          >
            <TextStrikethroughIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive("code") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleButtonClick(() => editor.chain().focus().toggleCode().run())
            }
            title="Toggle inline code"
          >
            <SourceCodeIcon className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <FontFamilyDropdown editor={editor} />
          <div className="w-px h-6 bg-border mx-2" />
          <Button
            variant={
              editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"
            }
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleButtonClick(() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              )
            }
            title="Toggle heading 2"
          >
            <Heading02Icon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleButtonClick(() =>
                editor.chain().focus().toggleBulletList().run()
              )
            }
            title="Toggle bullet list"
          >
            <LeftToRightListBulletIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleButtonClick(() =>
                editor.chain().focus().toggleBlockquote().run()
              )
            }
            title="Toggle blockquote"
          >
            <QuoteUpIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive("link") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleButtonClick(setLink)}
            title="Toggle link"
          >
            <Attachment01Icon className="h-4 w-4" />
          </Button>
          {isImageSelected && (
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
              title="Edit image size"
            >
              <Image02Icon className="h-4 w-4" />
            </Button>
          )}
          <div className="w-px h-6 bg-border mx-2" />
          <CodeBlockDropdown editor={editor} />
          <DiagramsDropdown editor={editor} />
          <div className="w-px h-6 bg-border mx-2" />
          <ExtraItemsDropdown
            editor={editor}
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
    </>
  );
};
