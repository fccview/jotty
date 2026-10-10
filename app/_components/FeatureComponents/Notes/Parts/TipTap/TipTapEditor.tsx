import { Editor, useEditor } from "@tiptap/react";
import { forwardRef, useImperativeHandle } from "react";
import { TiptapToolbar } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/TipTapToolbar";
import { UploadOverlay } from "@/app/_components/GlobalComponents/FormElements/UploadOverlay";
import { CompactImageResizeOverlay } from "@/app/_components/FeatureComponents/Notes/Parts/FileAttachment/CompactImageResizeOverlay";
import { CompactTableToolbar } from "@/app/_components/FeatureComponents/Notes/Parts/Table/CompactTableToolbar";
import { useState, useEffect, useRef, useCallback } from "react";
import { useShortcuts } from "@/app/_hooks/useShortcuts";
import { TableSyntax } from "@/app/_types";
import { useSettings } from "@/app/_utils/settings-store";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useFileUpload } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/EditorHooks/useFileUpload";
import { insertTextAtCursor, keepCaretThrough, runMarkdownEdit } from "@/app/_utils/markdown-editor-utils";
import { useMarkdownSync } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/EditorHooks/useMarkdownSync";
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
import { NOTE_PROSE_CLASS } from "@/app/_consts/notes";

const DRAFT_DELAY_MS = 300;

type TiptapEditorProps = {
  content: string;
  onChange: (
    content: string,
    isMarkdownMode: boolean,
    isDirty: boolean,
  ) => void;
  onRemoteChange?: (content: string, isMarkdownMode: boolean) => void;
  onModeChange?: (isMarkdownMode: boolean) => void;
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
    { content, onChange, onRemoteChange, onModeChange, tableSyntax, notes, checklists, collaborationUuid },
    ref,
  ) => {
    const { user, appSettings, tagsIndex, usersPublicData } = useAppMode();
    const { compactMode } = useSettings();
    const t = useTranslations();

    const editorSettings = appSettings?.editor || {
      enableSlashCommands: true,
      enableBubbleMenu: true,
      enableTableToolbar: true,
      enableBilateralLinks: true,
    };

    const defaultEditorIsMarkdown = user?.notesDefaultEditor === "markdown";
    const sync = useMarkdownSync(tableSyntax);
    const live = useLiveSession(collaborationUuid, () => content);
    const peopleRef = useRef(usersPublicData);
    peopleRef.current = usersPublicData;
    const avatarOf = useCallback(
      (name: string) => peopleRef.current.find((entry) => entry.username === name)?.avatarUrl || undefined,
      [],
    );

    const [isMarkdownMode, setIsMarkdownMode] = useState(defaultEditorIsMarkdown);
    const [markdownContent, setMarkdownContent] = useState(content);
    const [showBubbleMenu, setShowBubbleMenu] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [linkRequestPending, setLinkRequestPending] = useState(false);
    const [linkRequestHasSelection, setLinkRequestHasSelection] =
      useState(false);
    const isInitialized = useRef(false);
    const liveGeneration = useRef(0);
    const markdownRef = useRef(content);
    const markdownModeRef = useRef(defaultEditorIsMarkdown);
    markdownModeRef.current = isMarkdownMode;
    const isDirtyRef = useRef<boolean>(false);
    const draftTimeoutRef = useRef<NodeJS.Timeout>(undefined);

    const uploadHook = useFileUpload(appSettings?.maximumFileSize);
    const tableToolbar = useTableToolbar();

    const emit = useCallback(
      (markdown: string, isMarkdown: boolean, isDirty: boolean) => {
        markdownRef.current = markdown;
        onChange(markdown, isMarkdown, isDirty);
        if (!collaborationUuid || !isDirty) return;
        clearTimeout(draftTimeoutRef.current);
        draftTimeoutRef.current = setTimeout(
          () => saveDraft(collaborationUuid, markdown),
          DRAFT_DELAY_MS,
        );
      },
      [onChange, collaborationUuid],
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
        live && { doc: live.doc, awareness: live.awareness, avatarOf },
      ),
      content: "",
      onUpdate: ({ editor, transaction }) => {
        if (live && (!isInitialized.current || live.resetting.current)) return;
        if (live && isChangeOrigin(transaction)) {
          const markdown = sync.read(editor);
          if (markdownModeRef.current) {
            keepCaretThrough(markdownRef.current, markdown);
            setMarkdownContent(markdown);
          }
          markdownRef.current = markdown;
          onRemoteChange?.(markdown, markdownModeRef.current);
          return;
        }
        if (markdownModeRef.current) return;
        isDirtyRef.current = true;
        emit(sync.read(editor), false, true);
      },
      editorProps: {
        attributes: {
          class: `prose prose-sm px-6 pt-6 pb-4 sm:prose-base lg:prose-lg xl:prose-2xl dark:prose-invert [&_ul]:list-disc [&_ol]:list-decimal w-full max-w-none focus:outline-none ${
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
      if (!editor || editor.isDestroyed) return;
      onModeChange?.(!isMarkdownMode);
      if (isMarkdownMode) {
        if (!live) sync.show(editor, markdownRef.current);
        setIsMarkdownMode(false);
        emit(markdownRef.current, false, isDirtyRef.current);
        return;
      }
      const markdown = sync.read(editor);
      setMarkdownContent(markdown);
      setIsMarkdownMode(true);
      emit(markdown, true, isDirtyRef.current);
    }, [isMarkdownMode, editor, live, sync, emit, onModeChange]);

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
      if (isDirtyRef.current || content === markdownRef.current) return;
      markdownRef.current = content;
      if (isMarkdownMode) setMarkdownContent(content);
    }, [content, isMarkdownMode]);

    useEffect(() => {
      if (!editor || editor.isDestroyed || !live) return;
      if (liveGeneration.current === live.generation) return;
      isDirtyRef.current = live.restored;
      if (!live.ready) {
        emit(content, isMarkdownMode, false);
        return;
      }
      liveGeneration.current = live.generation;
      isInitialized.current = true;
      live.resetting.current = false;
      const fragment = live.doc.getXmlFragment(LIVE_FIELD);
      if (live.initialize && editor.isEmpty) {
        sync.show(editor, live.markdown);
        if (fragment.length === 0) {
          prosemirrorToYXmlFragment(editor.state.doc, fragment);
        }
        yUndoPluginKey.getState(editor.state)?.undoManager.clear();
      } else {
        sync.parse(editor, live.markdown);
      }
      const markdown = sync.read(editor);
      setMarkdownContent(markdown);
      emit(markdown, isMarkdownMode, isDirtyRef.current);
    }, [editor, live?.ready, live?.generation]);

    useEffect(() => {
      if (!editor || live || isInitialized.current) return;
      isInitialized.current = true;
      if (!isMarkdownMode) sync.show(editor, markdownRef.current);
    }, [editor, live, isMarkdownMode, sync]);

    useEffect(() => () => clearTimeout(draftTimeoutRef.current), []);

    const changeMarkdown = useCallback((newContent: string) => {
      if (isDirtyRef.current && newContent === markdownRef.current) return;
      setMarkdownContent(newContent);
      if (live && editor && !editor.isDestroyed) sync.show(editor, newContent);
      isDirtyRef.current = true;
      emit(newContent, true, true);
    }, [editor, live?.doc, sync, emit]);

    const insertSnippet = useCallback(
      (snippet: string) =>
        runMarkdownEdit((textarea) => insertTextAtCursor(textarea, `\n${snippet}`, ""), changeMarkdown),
      [changeMarkdown],
    );

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
              onImageUpload: (url) => insertSnippet(`![${file.name}](${url})`),
              onFileUpload: (data) => insertSnippet(`[📎 ${data.fileName}](${data.url})`),
            },
            true,
          );
        });
      },
      [uploadHook, insertSnippet],
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
            <UnifiedMarkdownRenderer content={markdownContent} className={NOTE_PROSE_CLASS} />
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
