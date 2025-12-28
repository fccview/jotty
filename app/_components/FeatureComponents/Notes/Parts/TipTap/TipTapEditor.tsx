import { Editor, useEditor } from "@tiptap/react";
import { forwardRef, useImperativeHandle } from "react";
import { TiptapToolbar } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/TipTapToolbar";
import { UploadOverlay } from "@/app/_components/GlobalComponents/FormElements/UploadOverlay";
import { CompactImageResizeOverlay } from "@/app/_components/FeatureComponents/Notes/Parts/FileAttachment/CompactImageResizeOverlay";
import { CompactTableToolbar } from "@/app/_components/FeatureComponents/Notes/Parts/Table/CompactTableToolbar";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  convertMarkdownToHtml,
  convertHtmlToMarkdownUnified,
} from "@/app/_utils/markdown-utils";
import { useShortcuts } from "@/app/_hooks/useShortcuts";
import { TableSyntax } from "@/app/_types";
import { useSettings } from "@/app/_utils/settings-store";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useFileUpload } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/EditorHooks/useFileUpload";
import { useImageResize } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/EditorHooks/useImageResize";
import { useTableToolbar } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/EditorHooks/useTableToolbar";
import { useOverlayClickOutside } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/EditorHooks/useOverlayClickOutside";
import { createEditorExtensions } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/EditorUtils/editorConfig";
import {
  createKeyDownHandler,
  createPasteHandler,
} from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/EditorUtils/editorHandlers";
import { MarkdownEditor } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/MarkdownEditor";
import { VisualEditor } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/VisualEditor";
import { BubbleMenu } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/FloatingMenu/BubbleMenu";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { useTranslations } from "next-intl";

type TiptapEditorProps = {
  content: string;
  onChange: (content: string, isMarkdownMode: boolean) => void;
  tableSyntax?: TableSyntax;
  notes?: any[];
  checklists?: any[];
};

export interface TiptapEditorRef {
  updateAtMentionData: (
    notes: any[],
    checklists: any[],
    username: string
  ) => void;
}

export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
  ({ content, onChange, tableSyntax, notes, checklists }, ref) => {
    const { user, appSettings } = useAppMode();
    const { compactMode } = useSettings();
    const t = useTranslations();

    const editorSettings = appSettings?.editor || {
      enableSlashCommands: true,
      enableBubbleMenu: true,
      enableTableToolbar: true,
      enableBilateralLinks: true,
    };

    const defaultEditorIsMarkdown = user?.notesDefaultEditor === "markdown";
    const contentIsMarkdown = !content.trim().startsWith("<");

    const getOriginalMarkdown = () => {
      if (contentIsMarkdown) {
        return content;
      }
      return convertHtmlToMarkdownUnified(content, tableSyntax);
    };

    const initialOutput = defaultEditorIsMarkdown && !contentIsMarkdown
      ? convertHtmlToMarkdownUnified(content, tableSyntax)
      : content;

    const [isMarkdownMode, setIsMarkdownMode] = useState(
      defaultEditorIsMarkdown
    );
    const [markdownContent, setMarkdownContent] = useState(
      isMarkdownMode ? initialOutput : ""
    );
    const [showBubbleMenu, setShowBubbleMenu] = useState(false);
    const [showLineNumbers, setShowLineNumbers] = useState(true);
    const [showPreview, setShowPreview] = useState(false);
    const isInitialized = useRef(false);
    const debounceTimeoutRef = useRef<NodeJS.Timeout>();
    const originalMarkdownRef = useRef<string>(getOriginalMarkdown());
    const richEditorWasEditedRef = useRef<boolean>(false);

    const uploadHook = useFileUpload(appSettings?.maximumFileSize);
    const tableToolbar = useTableToolbar();

    const debouncedOnChange = useCallback(
      (newContent: string, isMarkdown: boolean) => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
          onChange(newContent, isMarkdown);
        }, 0);
      },
      [onChange]
    );

    const imageClickRef = useRef<((pos: any) => void) | null>(null);

    const editor: Editor | null = useEditor({
      immediatelyRender: false,
      extensions: createEditorExtensions(
        {
          onImageClick: (pos) => {
            if (imageClickRef.current) {
              imageClickRef.current(pos);
            }
          },
          onTableSelect: tableToolbar.handleTableSelect,
        },
        editorSettings,
        {
          notes: notes || [],
          checklists: checklists || [],
          username: user?.username || "",
        },
        t
      ),
      content: "",
      onUpdate: ({ editor }) => {
        if (!isMarkdownMode) {
          richEditorWasEditedRef.current = true;
          debouncedOnChange(editor.getHTML(), false);
        }
      },
      editorProps: {
        attributes: {
          class: `prose prose-sm px-6 pt-6 pb-12 sm:prose-base lg:prose-lg xl:prose-2xl dark:prose-invert [&_ul]:list-disc [&_ol]:list-decimal [&_table]:border-collapse [&_table]:w-full [&_table]:my-4 [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted [&_th]:font-semibold [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_tr:nth-child(even)]:bg-muted/50 w-full max-w-none focus:outline-none ${compactMode ? "!max-w-[900px] mx-auto" : ""
            }`,
        },
        handleKeyDown: (view, event) => {
          return createKeyDownHandler(editor)(view, event);
        },
        handlePaste: (view, event) => {
          return createPasteHandler(editor, uploadHook.handleFileUpload)(
            view,
            event
          );
        },
      },
    });

    useImperativeHandle(ref, () => ({
      updateAtMentionData: (
        notes: any[],
        checklists: any[],
        username: string
      ) => {
        (editor?.commands as any)?.updateAtMentionData(
          notes,
          checklists,
          username
        );
      },
    }));

    const toggleMode = useCallback(() => {
      if (isMarkdownMode) {
        setTimeout(() => {
          if (editor) {
            originalMarkdownRef.current = markdownContent;
            richEditorWasEditedRef.current = false;
            const htmlContent = convertMarkdownToHtml(markdownContent);
            editor.commands.setContent(htmlContent, { emitUpdate: false });
            setIsMarkdownMode(false);
            debouncedOnChange(htmlContent, false);
          }
        }, 0);
      } else {
        setTimeout(() => {
          if (editor) {
            let finalMarkdown: string;
            if (richEditorWasEditedRef.current) {
              const htmlContent = editor.getHTML();
              finalMarkdown = convertHtmlToMarkdownUnified(
                htmlContent,
                tableSyntax
              );
            } else {
              finalMarkdown = originalMarkdownRef.current;
            }
            setMarkdownContent(finalMarkdown);
            setIsMarkdownMode(true);
            debouncedOnChange(finalMarkdown, true);
            richEditorWasEditedRef.current = false;
          }
        }, 0);
      }
    }, [isMarkdownMode, markdownContent, tableSyntax, editor, debouncedOnChange]);

    useShortcuts([
      {
        code: "KeyM",
        modKey: true,
        shiftKey: true,
        altKey: true,
        handler: () => toggleMode(),
      },
    ]);

    const imageResize = useImageResize(editor);

    useEffect(() => {
      if (editor) {
        imageClickRef.current = imageResize.handleImageClick;
      }
    }, [editor, imageResize.handleImageClick]);

    useOverlayClickOutside({
      isActive:
        imageResize.showOverlay || tableToolbar.showToolbar || showBubbleMenu,
      onClose: () => {
        imageResize.closeOverlay();
        tableToolbar.closeToolbar();
        setShowBubbleMenu(false);
      },
    });

    useEffect(() => {
      const contentIsMarkdown = !content.trim().startsWith("<");
      const markdownContent = contentIsMarkdown
        ? content
        : convertHtmlToMarkdownUnified(content, tableSyntax);

      originalMarkdownRef.current = markdownContent;

      if (isMarkdownMode) {
        setMarkdownContent(markdownContent);
      }
    }, [content, isMarkdownMode, tableSyntax]);

    useEffect(() => {
      if (editor && !isInitialized.current) {
        isInitialized.current = true;
        setTimeout(() => {
          if (isMarkdownMode) {
            const htmlContent = convertMarkdownToHtml(markdownContent);
            editor.commands.setContent(htmlContent, { emitUpdate: false });
          } else {
            const contentToSet = content.trim().startsWith("<")
              ? content
              : convertMarkdownToHtml(content);
            editor.commands.setContent(contentToSet, { emitUpdate: false });
          }
        }, 0);
      }
    }, [editor, content, isMarkdownMode, markdownContent]);

    useEffect(() => {
      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
      };
    }, []);

    const handleMarkdownChange = (
      e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
      const newContent = e.target.value;
      setMarkdownContent(newContent);
      debouncedOnChange(newContent, true);
    };

    const handleVisualFileDrop = useCallback(
      (files: File[]) => {
        files.forEach((file) => {
          uploadHook.handleFileUpload(
            file,
            {
              onImageUpload: (url) => {
                editor?.chain().focus().setImage({ src: url }).run();
              },
              onFileUpload: (data) => {
                editor
                  ?.chain()
                  .focus()
                  .setFileAttachment({
                    url: data.url,
                    fileName: data.fileName,
                    mimeType: data.mimeType,
                    type: data.type,
                  })
                  .run();
              },
            },
            true
          );
        });
      },
      [editor, uploadHook]
    );

    const handleMarkdownFileDrop = useCallback(
      (files: File[]) => {
        files.forEach((file) => {
          uploadHook.handleFileUpload(
            file,
            {
              onImageUpload: (url) => {
                const markdownImage = `![${file.name}](${url})`;
                const newContent = markdownContent + "\n" + markdownImage;
                setMarkdownContent(newContent);
                debouncedOnChange(newContent, true);
              },
              onFileUpload: (data) => {
                const markdownLink = `[📎 ${data.fileName}](${data.url})`;
                const newContent = markdownContent + "\n" + markdownLink;
                setMarkdownContent(newContent);
                debouncedOnChange(newContent, true);
              },
            },
            true
          );
        });
      },
      [markdownContent, uploadHook, debouncedOnChange]
    );

    return (
      <div className="flex flex-col h-full">
        <div className={`bg-background border-b border-border px-4 flex items-center justify-between sticky top-0 z-10 ${isMarkdownMode ? "py-0 lg:py-2" : "py-2"}`}>
          <TiptapToolbar
            editor={editor}
            isMarkdownMode={isMarkdownMode}
            toggleMode={toggleMode}
            showLineNumbers={showLineNumbers}
            onToggleLineNumbers={() => setShowLineNumbers(!showLineNumbers)}
            showPreview={showPreview}
            onTogglePreview={() => setShowPreview(!showPreview)}
            markdownContent={markdownContent}
          />
        </div>

        <UploadOverlay
          isVisible={
            uploadHook.isUploading ||
            !!uploadHook.uploadError ||
            !!uploadHook.fileSizeError
          }
          isUploading={uploadHook.isUploading}
          uploadError={
            uploadHook.uploadError || uploadHook.fileSizeError || undefined
          }
          fileName={uploadHook.uploadingFileName || undefined}
          onRetry={uploadHook.resetErrors}
        />

        {isMarkdownMode && showPreview ? (
          <div
            className={`px-6 pt-6 pb-12 overflow-y-auto flex-1 ${compactMode ? "max-w-[900px] mx-auto" : ""
              }`}
          >
            <UnifiedMarkdownRenderer content={markdownContent} />
          </div>
        ) : isMarkdownMode ? (
          <MarkdownEditor
            content={markdownContent}
            onChange={handleMarkdownChange}
            onFileDrop={handleMarkdownFileDrop}
            showLineNumbers={showLineNumbers}
          />
        ) : (
          <>
            <VisualEditor
              editor={editor}
              onFileDrop={handleVisualFileDrop}
              onTextSelection={setShowBubbleMenu}
            />
            {editor && editorSettings.enableBubbleMenu && (
              <BubbleMenu
                editor={editor}
                isVisible={showBubbleMenu}
                onClose={() => setShowBubbleMenu(false)}
              />
            )}
          </>
        )}

        <CompactImageResizeOverlay
          isVisible={imageResize.showOverlay}
          position={{ x: 0, y: 0 }}
          onClose={imageResize.closeOverlay}
          onResize={imageResize.handleResize}
          onPreviewUpdate={(w, h) =>
            imageResize.updateImageAttrs(w, h, false, true)
          }
          currentWidth={imageResize.imageAttrs.width}
          currentHeight={imageResize.imageAttrs.height}
          imageUrl={imageResize.imageAttrs.src}
          targetElement={imageResize.targetElement || undefined}
        />

        {editor && editorSettings.enableTableToolbar && (
          <CompactTableToolbar
            editor={editor}
            isVisible={tableToolbar.showToolbar}
            position={tableToolbar.position}
            targetElement={tableToolbar.targetElement || undefined}
          />
        )}
      </div>
    );
  }
);

TiptapEditor.displayName = "TiptapEditor";
