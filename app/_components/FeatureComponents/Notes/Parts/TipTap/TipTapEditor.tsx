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
import { menuCeilingProps } from "@/app/_utils/menu-placement-utils";
import { isChangeOrigin } from "@tiptap/extension-collaboration";
import { prosemirrorToYXmlFragment, yUndoPluginKey } from "@tiptap/y-tiptap";
import { LIVE_FIELD, saveDraft, useLiveSession } from "@/app/_hooks/useLiveSession";
import { LiveStatusBar } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/LiveStatusBar";

type TiptapEditorProps = {
  content: string;
  onChange: (
    content: string,
    isMarkdownMode: boolean,
    isDirty: boolean,
  ) => void;
  onRemoteChange?: (content: string, isMarkdownMode: boolean) => void;
  tableSyntax?: TableSyntax;
  notes?: any[];
  checklists?: any[];
  collaborationUuid?: string;
};

export interface TiptapEditorRef {
  updateAtMentionData: (
    notes: any[],
    checklists: any[],
    username: string,
  ) => void;
}

export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
  (
    { content, onChange, onRemoteChange, tableSyntax, notes, checklists, collaborationUuid },
    ref,
  ) => {
    const { user, appSettings, tagsIndex } = useAppMode();
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

    const live = useLiveSession(collaborationUuid, getOriginalMarkdown);

    const initialOutput =
      defaultEditorIsMarkdown && !contentIsMarkdown
        ? convertHtmlToMarkdownUnified(content, tableSyntax)
        : content;

    const [isMarkdownMode, setIsMarkdownMode] = useState(
      defaultEditorIsMarkdown,
    );
    const [markdownContent, setMarkdownContent] = useState(
      isMarkdownMode ? initialOutput : "",
    );
    const [showBubbleMenu, setShowBubbleMenu] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [linkRequestPending, setLinkRequestPending] = useState(false);
    const [linkRequestHasSelection, setLinkRequestHasSelection] =
      useState(false);
    const isInitialized = useRef(false);
    const liveGeneration = useRef(0);
    const debounceTimeoutRef = useRef<NodeJS.Timeout>(undefined);
    const originalMarkdownRef = useRef<string>(getOriginalMarkdown());
    const richEditorWasEditedRef = useRef<boolean>(false);
    const isDirtyRef = useRef<boolean>(false);

    const uploadHook = useFileUpload(appSettings?.maximumFileSize);
    const tableToolbar = useTableToolbar();

    const draftTimeoutRef = useRef<NodeJS.Timeout>(undefined);

    const debouncedOnChange = useCallback(
      (newContent: string, isMarkdown: boolean, isDirty: boolean) => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
          onChange(newContent, isMarkdown, isDirty);
        }, 0);
        if (!collaborationUuid || !isDirty) return;
        clearTimeout(draftTimeoutRef.current);
        draftTimeoutRef.current = setTimeout(() => saveDraft(
          collaborationUuid,
          isMarkdown ? newContent : convertHtmlToMarkdownUnified(newContent, tableSyntax),
        ), 300);
      },
      [onChange, collaborationUuid, tableSyntax],
    );

    const imageClickRef = useRef<((pos: any) => void) | null>(null);

    const handleRichEditorLinkRequest = useCallback((hasSelection: boolean) => {
      setLinkRequestHasSelection(hasSelection);
      setLinkRequestPending(true);
    }, []);

    const editor: Editor | null = useEditor({
      immediatelyRender: false,
      editable: !live,
      extensions: createEditorExtensions(
        {
          onImageClick: (pos) => {
            if (imageClickRef.current) {
              imageClickRef.current(pos);
            }
          },
          onTableSelect: tableToolbar.handleTableSelect,
          onLinkRequest: handleRichEditorLinkRequest,
        },
        editorSettings,
        {
          notes: notes || [],
          checklists: checklists || [],
          username: user?.username || "",
          tags: Object.keys(tagsIndex || {}),
        },
        t,
        live,
      ),
      content: "",
      onUpdate: ({ editor, transaction }) => {
        if (live && (!isInitialized.current || live.resetting.current)) return;
        if (live && isChangeOrigin(transaction)) {
          if (!isMarkdownMode) {
            richEditorWasEditedRef.current = true;
            onRemoteChange?.(editor.getHTML(), false);
            return;
          }
          const markdown = convertHtmlToMarkdownUnified(editor.getHTML(), tableSyntax);
          setMarkdownContent(markdown);
          originalMarkdownRef.current = markdown;
          onRemoteChange?.(markdown, true);
        } else if (!isMarkdownMode) {
          richEditorWasEditedRef.current = true;
          isDirtyRef.current = true;
          debouncedOnChange(editor.getHTML(), false, true);
        }
      },
      editorProps: {
        attributes: {
          class: `prose prose-sm px-6 pt-6 pb-4 sm:prose-base lg:prose-lg xl:prose-2xl dark:prose-invert [&_ul]:list-disc [&_ol]:list-decimal [&_table]:border-collapse [&_table]:w-full [&_table]:my-4 [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted [&_th]:font-semibold [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_tr:nth-child(even)]:bg-muted/50 w-full max-w-none focus:outline-none ${
            compactMode ? "!max-w-[900px] mx-auto" : ""
          }`,
        },
        handleKeyDown: (view, event) => {
          return createKeyDownHandler(editor)(view, event);
        },
        handlePaste: (view, event) => {
          return createPasteHandler(editor, uploadHook.handleFileUpload)(
            view,
            event,
          );
        },
      },
    });

    useImperativeHandle(ref, () => ({
      updateAtMentionData: (
        notes: any[],
        checklists: any[],
        username: string,
      ) => {
        (editor?.commands as any)?.updateAtMentionData(
          notes,
          checklists,
          username,
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
            debouncedOnChange(htmlContent, false, isDirtyRef.current);
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
                tableSyntax,
              );
            } else {
              finalMarkdown = originalMarkdownRef.current;
            }
            setMarkdownContent(finalMarkdown);
            setIsMarkdownMode(true);
            debouncedOnChange(finalMarkdown, true, isDirtyRef.current);
            richEditorWasEditedRef.current = false;
          }
        }, 0);
      }
    }, [
      isMarkdownMode,
      markdownContent,
      tableSyntax,
      editor,
      debouncedOnChange,
    ]);

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
      if (!editor || editor.isDestroyed || !live) return;
      editor.setEditable(live.ready);
    }, [editor, live?.ready]);

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

      if (isMarkdownMode && !isDirtyRef.current) {
        setMarkdownContent(markdownContent);
      }
    }, [content, isMarkdownMode, tableSyntax]);

    useEffect(() => {
      if (!editor || editor.isDestroyed || !live) return;
      if (liveGeneration.current === live.generation) return;
      isDirtyRef.current = live.restored;
      if (!live.ready) {
        debouncedOnChange(content, isMarkdownMode, false);
        return;
      }
      liveGeneration.current = live.generation;
      isInitialized.current = true;
      live.resetting.current = false;
      const fragment = live.doc.getXmlFragment(LIVE_FIELD);
      if (live.initialize && editor.isEmpty) {
        editor.commands.setContent(convertMarkdownToHtml(live.markdown), { emitUpdate: false });
        if (fragment.length === 0) {
          prosemirrorToYXmlFragment(editor.state.doc, fragment);
        }
        yUndoPluginKey.getState(editor.state)?.undoManager.clear();
      }
      const markdown = convertHtmlToMarkdownUnified(editor.getHTML(), tableSyntax);
      originalMarkdownRef.current = markdown;
      setMarkdownContent(markdown);
      debouncedOnChange(isMarkdownMode ? markdown : editor.getHTML(), isMarkdownMode, isDirtyRef.current);
    }, [editor, live?.ready, live?.generation]);

    useEffect(() => {
      if (editor && !live && !isInitialized.current) {
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
        clearTimeout(draftTimeoutRef.current);
      };
    }, []);

    const changeMarkdown = useCallback((newContent: string) => {
      setMarkdownContent(newContent);
      if (live && editor && !editor.isDestroyed) {
        editor.commands.setContent(convertMarkdownToHtml(newContent), { emitUpdate: false });
      }
      isDirtyRef.current = true;
      debouncedOnChange(newContent, true, true);
    }, [editor, live?.doc, debouncedOnChange]);

    const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      changeMarkdown(e.target.value);

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
            true,
          );
        });
      },
      [editor, uploadHook],
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
                changeMarkdown(newContent);
              },
              onFileUpload: (data) => {
                const markdownLink = `[📎 ${data.fileName}](${data.url})`;
                const newContent = markdownContent + "\n" + markdownLink;
                changeMarkdown(newContent);
              },
            },
            true,
          );
        });
      },
      [markdownContent, uploadHook, changeMarkdown],
    );

    return (
      <div className="flex flex-col h-full pb-0">
        {live && <LiveStatusBar live={live} />}
        <div
          className={`bg-background border-b border-border px-4 flex items-center justify-between sticky top-0 z-10 py-2`}
          {...menuCeilingProps}
        >
          <TiptapToolbar
            editor={editor}
            isMarkdownMode={isMarkdownMode}
            toggleMode={toggleMode}
            showPreview={showPreview}
            onTogglePreview={() => setShowPreview(!showPreview)}
            onMarkdownChange={changeMarkdown}
            linkRequestPending={linkRequestPending}
            linkRequestHasSelection={linkRequestHasSelection}
            onLinkRequestHandled={() => setLinkRequestPending(false)}
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
            className={`px-6 pt-6 pb-4 overflow-y-auto flex-1 ${
              compactMode ? "max-w-[900px] mx-auto" : ""
            }`}
          >
            <UnifiedMarkdownRenderer content={markdownContent} />
          </div>
        ) : isMarkdownMode ? (
          <MarkdownEditor
            content={markdownContent}
            onChange={handleMarkdownChange}
            onFileDrop={handleMarkdownFileDrop}
            onLinkRequest={(hasSelection) => {
              setLinkRequestHasSelection(hasSelection);
              setLinkRequestPending(true);
            }}
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
  },
);

TiptapEditor.displayName = "TiptapEditor";
