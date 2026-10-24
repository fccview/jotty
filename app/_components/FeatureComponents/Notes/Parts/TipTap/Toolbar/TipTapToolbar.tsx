import { Editor, useEditorState } from "@tiptap/react";
import {
  TextBoldIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  SourceCodeIcon,
  Heading02Icon,
  QuoteUpIcon,
  Attachment01Icon,
  ViewIcon,
  ViewOffSlashIcon,
  TextUnderlineIcon,
  Image02Icon,
  TextIcon,
  LeftToRightListBulletIcon,
  GravityIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { FileModal, type AttachTarget } from "@/app/_components/GlobalComponents/Modals/FilesModal/FileModal";
import { ImageSizeModal } from "@/app/_components/GlobalComponents/Modals/ImageSizeModal";
import { CodeBlockDropdown, CodeBlockMenu } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/CodeBlocksDropdown";
import { DiagramsDropdown, DiagramsMenu } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/DiagramsDropdown";
import { ListMenu, ListMenuDropdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/ListMenuDropdown";
import { TableInsertModal } from "@/app/_components/FeatureComponents/Notes/Parts/Table/TableInsertModal";
import { FontFamilyDropdown, FontFamilyMenu } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/FontFamilyDropdown";
import { OverflowToolbarRow } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/OverflowToolbarRow";
import { ToolbarTool, toolbarSeparator } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/toolbarTools";
import { ComponentType, useState, useEffect } from "react";
import { cn } from "@/app/_utils/global-utils";
import { ExtraItemsDropdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/ExtraItemsDropdown";
import { PrismThemeDropdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/PrismThemeDropdown";
import { EditorSettingsDropdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/EditorSettingsDropdown";
import { useTranslations } from "next-intl";
import { EditorModeSwitch } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/EditorModeSwitch";
import { PromptModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/PromptModal";
import * as MarkdownUtils from "@/app/_utils/markdown-editor-utils";
import { insertTextAtCursor, runMarkdownEdit } from "@/app/_utils/markdown-editor-utils";
import { useMarkdownFormats } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/EditorHooks/useMarkdownFormats";
import {
  QuickBarPortal,
  QuickBarSlots,
  quickBarButton,
} from "@/app/_components/FeatureComponents/Notes/Parts/NoteEditor/NoteQuickBar";

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";
const alt = isMac ? "⌥" : "Alt";
const modeShortcut = `${mod}+Shift+${alt}+M`;

type ToolbarProps = {
  editor: Editor | null;
  attachTarget?: AttachTarget;
  isMarkdownMode: boolean;
  toggleMode: () => void;
  showPreview?: boolean;
  onTogglePreview?: () => void;
  onMarkdownChange?: (content: string) => void;
  linkRequestPending?: boolean;
  linkRequestHasSelection?: boolean;
  onLinkRequestHandled?: () => void;
};

export const TiptapToolbar = ({
  editor,
  attachTarget,
  isMarkdownMode,
  toggleMode,
  showPreview = false,
  onTogglePreview,
  onMarkdownChange,
  linkRequestPending = false,
  linkRequestHasSelection = false,
  onLinkRequestHandled,
}: ToolbarProps) => {
  const t = useTranslations();
  const [showFileModal, setShowFileModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showImageSizeModal, setShowImageSizeModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showLinkTextModal, setShowLinkTextModal] = useState(false);
  const [previousUrl, setPreviousUrl] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
  const [selectedImageWidth, setSelectedImageWidth] = useState<
    number | undefined
  >();
  const [selectedImageHeight, setSelectedImageHeight] = useState<
    number | undefined
  >();

  useEffect(() => {
    if (linkRequestPending) {
      if (linkRequestHasSelection) {
        if (!isMarkdownMode && editor) {
          const currentUrl = editor.getAttributes("link").href;
          setPreviousUrl(currentUrl || "");
        } else {
          setPreviousUrl("");
        }
        setShowLinkModal(true);
      } else {
        setShowLinkTextModal(true);
      }

      if (onLinkRequestHandled) {
        onLinkRequestHandled();
      }
    }
  }, [linkRequestPending, linkRequestHasSelection, isMarkdownMode, editor, onLinkRequestHandled]);

  const listState = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return { isInList: false, isNested: false, isInBulletList: false, isInOrderedList: false, currentItemIsEmpty: false };
      const isInBulletList = e.isActive('bulletList');
      const isInOrderedList = e.isActive('orderedList');
      const isInList = isInBulletList || isInOrderedList;
      let isNested = false;
      if (isInList) {
        const { $anchor } = e.state.selection;
        outer: for (let d = $anchor.depth; d >= 0; d--) {
          if ($anchor.node(d).type.name === 'listItem') {
            for (let d2 = d - 1; d2 >= 0; d2--) {
              if ($anchor.node(d2).type.name === 'listItem') { isNested = true; break outer; }
            }
            break;
          }
        }
      }
      return { isInList, isNested, isInBulletList, isInOrderedList, currentItemIsEmpty: e.state.selection.$anchor.parent.textContent === '' };
    },
  }) ?? { isInList: false, isNested: false, isInBulletList: false, isInOrderedList: false, currentItemIsEmpty: false };

  const markdownFormats = useMarkdownFormats(isMarkdownMode);

  if (!editor) {
    return null;
  }

  const toolbarListState = isMarkdownMode
    ? {
        ...listState,
        isInList: markdownFormats.bulletList || markdownFormats.orderedList || markdownFormats.taskList,
        isInBulletList: markdownFormats.bulletList,
        isInOrderedList: markdownFormats.orderedList,
      }
    : listState;

  const setLink = () => {
    if (isMarkdownMode) {
      const textarea = MarkdownUtils.getMarkdownTextarea();
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
        handleMarkdownButtonClick((textarea) => MarkdownUtils.insertSelectedText(textarea, text));
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

  const handleButtonClick = (command: () => void) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    command();
    editor.commands.setTextSelection({ from, to });
  };

  const handleMarkdownButtonClick = (markdownFn: (textarea: HTMLTextAreaElement) => string) =>
    runMarkdownEdit(markdownFn, onMarkdownChange);

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

  const isOn = (rich: () => boolean, markdown: boolean) =>
    isMarkdownMode ? markdown : rich();

  const buttonTool = (
    key: string,
    label: string,
    hint: string,
    Icon: ComponentType<{ className?: string }>,
    isActive: boolean,
    run: () => void
  ): ToolbarTool => ({
    key,
    node: (
      <Button
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        onMouseDown={(e) => e.preventDefault()}
        onClick={run}
        title={hint}
      >
        <Icon className="h-4 w-4" />
      </Button>
    ),
    overflow: { key, label, icon: <Icon className="h-4 w-4" />, isActive, onSelect: run },
  });

  const menuProps = { editor, isMarkdownMode, onMarkdownChange };

  const tools: ToolbarTool[] = [
    buttonTool(
      "bold",
      t("editor.bold"),
      `${t("editor.toggleBold")} (${mod}+B)`,
      TextBoldIcon,
      isOn(() => editor.isActive("bold"), markdownFormats.bold),
      () => handleDualModeButton(() => editor.chain().focus().toggleBold().run(), MarkdownUtils.insertBold)
    ),
    buttonTool(
      "italic",
      t("editor.italic"),
      `${t("editor.toggleItalic")} (${mod}+I)`,
      TextItalicIcon,
      isOn(() => editor.isActive("italic"), markdownFormats.italic),
      () => handleDualModeButton(() => editor.chain().focus().toggleItalic().run(), MarkdownUtils.insertItalic)
    ),
    buttonTool(
      "underline",
      t("editor.underline"),
      `${t("editor.toggleUnderline")} (${mod}+U)`,
      TextUnderlineIcon,
      isOn(() => editor.isActive("underline"), markdownFormats.underline),
      () => handleDualModeButton(() => editor.chain().focus().toggleUnderline().run(), MarkdownUtils.insertUnderline)
    ),
    buttonTool(
      "strike",
      t("editor.strikethrough"),
      `${t("editor.toggleStrikethrough")} (${mod}+Shift+X)`,
      TextStrikethroughIcon,
      isOn(() => editor.isActive("strike"), markdownFormats.strike),
      () => handleDualModeButton(() => editor.chain().focus().toggleStrike().run(), MarkdownUtils.insertStrikethrough)
    ),
    buttonTool(
      "inlineCode",
      t("editor.inlineCode"),
      `${t("editor.toggleInlineCode")} (${mod}+E)`,
      SourceCodeIcon,
      isOn(() => editor.isActive("code"), markdownFormats.code),
      () => handleDualModeButton(() => editor.chain().focus().toggleCode().run(), MarkdownUtils.insertInlineCode)
    ),
    ...(isMarkdownMode
      ? []
      : [
          toolbarSeparator("fontStart"),
          {
            key: "font",
            node: <FontFamilyDropdown editor={editor} />,
            overflow: {
              key: "font",
              label: t("editor.fontFamily"),
              icon: <TextIcon className="h-4 w-4" />,
              menu: <FontFamilyMenu editor={editor} />,
            },
          },
          toolbarSeparator("fontEnd"),
        ]),
    buttonTool(
      "heading",
      t("editor.heading2"),
      `${t("editor.toggleHeading2")} (${mod}+${alt}+2)`,
      Heading02Icon,
      isOn(() => editor.isActive("heading", { level: 2 }), markdownFormats.heading === 2),
      () =>
        handleDualModeButton(
          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          (textarea) => MarkdownUtils.insertHeading(textarea, 2)
        )
    ),
    {
      key: "lists",
      node: <ListMenuDropdown {...menuProps} listState={toolbarListState} />,
      overflow: {
        key: "lists",
        label: t("editor.listOptions"),
        icon: <LeftToRightListBulletIcon className="h-4 w-4" />,
        isActive: toolbarListState.isInList,
        menu: <ListMenu {...menuProps} />,
      },
    },
    buttonTool(
      "quote",
      t("editor.quote"),
      `${t("editor.toggleBlockquote")} (${mod}+Shift+B)`,
      QuoteUpIcon,
      isOn(() => editor.isActive("blockquote"), markdownFormats.blockquote),
      () => handleDualModeButton(() => editor.chain().focus().toggleBlockquote().run(), MarkdownUtils.insertBlockquote)
    ),
    buttonTool(
      "link",
      t("editor.link"),
      `${t("editor.toggleLink")} (${mod}+Shift+K)`,
      Attachment01Icon,
      isOn(() => editor.isActive("link"), markdownFormats.link),
      () => handleButtonClick(setLink)
    ),
    ...(isImageSelected && !isMarkdownMode
      ? [
          buttonTool("imageSize", t("editor.editImageSize"), t("editor.editImageSize"), Image02Icon, true, () => {
            setSelectedImageUrl(selectedImageAttrs.src || "");
            setSelectedImageWidth(selectedImageAttrs.width);
            setSelectedImageHeight(selectedImageAttrs.height);
            setShowImageSizeModal(true);
          }),
        ]
      : []),
    toolbarSeparator("blocksStart"),
    {
      key: "codeBlock",
      node: <CodeBlockDropdown {...menuProps} />,
      overflow: {
        key: "codeBlock",
        label: t("editor.codeBlock"),
        icon: <SourceCodeIcon className="h-4 w-4" />,
        isActive: editor.isActive("codeBlock"),
        menu: <CodeBlockMenu {...menuProps} />,
      },
    },
    {
      key: "diagrams",
      node: <DiagramsDropdown {...menuProps} />,
      overflow: {
        key: "diagrams",
        label: t("editor.diagrams"),
        icon: <GravityIcon className="h-4 w-4" />,
        menu: <DiagramsMenu {...menuProps} />,
      },
    },
  ];

  return (
    <>
      <div
        className={cn(
          "bg-background flex w-full items-center lg:gap-4 px-0 lg:px-2 lg:py-2",
          isMarkdownMode ? "md:justify-end" : "md:justify-between"
        )}
      >
        <div className="flex-shrink-0 md:order-last flex items-center gap-1">
          {isMarkdownMode && (
            <div className="hidden lg:flex">
              <EditorSettingsDropdown
                isMarkdownMode={isMarkdownMode}
                showPreview={showPreview}
                onTogglePreview={onTogglePreview}
              />
            </div>
          )}
          {isMarkdownMode && (
            <div className="hidden lg:flex">
              <PrismThemeDropdown isMarkdownMode={isMarkdownMode} />
            </div>
          )}
          <EditorModeSwitch
            isMarkdownMode={isMarkdownMode}
            onToggle={toggleMode}
            shortcut={modeShortcut}
            className="hidden lg:inline-grid"
          />
        </div>

        <QuickBarPortal
          slot={QuickBarSlots.MODES}
          fallbackClassName="flex lg:hidden flex-shrink-0 items-center gap-1"
        >
          {isMarkdownMode && onTogglePreview && (
            <Button
              variant={showPreview ? "default" : "ghost"}
              size="icon"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onTogglePreview}
              title={showPreview ? t('editor.hidePreview') : t('editor.showPreview')}
              aria-label={showPreview ? t('editor.hidePreview') : t('editor.showPreview')}
              className={quickBarButton}
            >
              {showPreview ? (
                <ViewOffSlashIcon className="h-5 w-5" />
              ) : (
                <ViewIcon className="h-5 w-5" />
              )}
            </Button>
          )}
          <EditorModeSwitch
            isMarkdownMode={isMarkdownMode}
            onToggle={toggleMode}
            shortcut={modeShortcut}
            compact
          />
        </QuickBarPortal>

        <OverflowToolbarRow
          tools={tools}
          renderMore={(hidden) => (
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
              overflowTools={hidden}
            />
          )}
        />
      </div>

      <FileModal
        isOpen={showFileModal}
        target={attachTarget}
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
