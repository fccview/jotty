import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading2,
  List,
  Quote,
  Link as LinkIcon,
  FileText,
  Eye,
  Underline,
} from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { FileModal } from "@/app/_components/GlobalComponents/Modals/FilesModal/FileModal";
import { CodeBlockDropdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/CodeBlocksDropdown";
import { TableInsertModal } from "@/app/_components/FeatureComponents/Notes/Parts/Table/TableInsertModal";
import { FontFamilyDropdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/FontFamilyDropdown";
import { useState } from "react";
import { cn } from "@/app/_utils/global-utils";
import { ExtraItemsDropdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/ExtraItemsDropdown";

type ToolbarProps = {
  editor: Editor | null;
  isMarkdownMode: boolean;
  toggleMode: () => void;
};

export const TiptapToolbar = ({
  editor,
  isMarkdownMode,
  toggleMode,
}: ToolbarProps) => {
  const [showFileModal, setShowFileModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);

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
    type: "image" | "file",
    fileName?: string,
    mimeType?: string
  ) => {
    if (type === "image") {
      editor.chain().focus().setImage({ src: url }).run();
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
          type: "file",
        })
        .run();
    }
  };

  const handleButtonClick = (command: () => void) => {
    const { from, to } = editor.state.selection;
    command();
    editor.commands.setTextSelection({ from, to });
  };

  return (
    <>
      <div className={cn("bg-background flex w-full items-center lg:gap-4 px-0 lg:px-2 lg:py-2", isMarkdownMode ? "md:justify-end" : "md:justify-between")}>
        <div className="flex-shrink-0 md:order-last">
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleMode}
            className="flex-shrink-0 hidden lg:flex"
          >
            {isMarkdownMode ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                <span>Rich Text</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                <span>Markdown</span>
              </>
            )}
          </Button>
        </div>

        <div className="fixed bottom-[62px] w-full left-0 lg:hidden z-40 bg-background">
          <div className="flex gap-1 p-2 border-b border-border w-full justify-center items-center">
            <Button
              variant={!isMarkdownMode ? "default" : "ghost"}
              className={`w-1/2`}
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleMode}
            >
              <Eye className="h-4 w-4 mr-2" />
              <span>Rich Text</span>
            </Button>

            <Button
              variant={isMarkdownMode ? "default" : "ghost"}
              className={`w-1/2`}
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleMode}
            >
              <FileText className="h-4 w-4 mr-2" />
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
          >
            <Bold className="h-4 w-4" />
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
          >
            <Italic className="h-4 w-4" />
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
          >
            <Underline className="h-4 w-4" />
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
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive("code") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              handleButtonClick(() => editor.chain().focus().toggleCode().run())
            }
          >
            <Code className="h-4 w-4" />
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
          >
            <Heading2 className="h-4 w-4" />
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
          >
            <List className="h-4 w-4" />
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
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive("link") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleButtonClick(setLink)}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <CodeBlockDropdown editor={editor} />
          <div className="w-px h-6 bg-border mx-2" />
          <ExtraItemsDropdown
            editor={editor}
            onFileModalOpen={() => setShowFileModal(true)}
            onTableModalOpen={() => setShowTableModal(true)}
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
    </>
  );
};