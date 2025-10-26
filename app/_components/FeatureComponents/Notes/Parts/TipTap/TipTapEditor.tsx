import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import ListItem from "@tiptap/extension-list-item";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import BulletList from "@tiptap/extension-bullet-list";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { TiptapToolbar } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/TipTapToolbar";
import { FileAttachmentExtension } from "@/app/_components/FeatureComponents/Notes/Parts/FileAttachment/FileAttachmentExtension";
import { CodeBlockNodeView } from "@/app/_components/FeatureComponents/Notes/Parts/CodeBlock/CodeBlockNodeView";
import { UploadOverlay } from "@/app/_components/GlobalComponents/FormElements/UploadOverlay";
import { CompactImageResizeOverlay } from "./CompactImageResizeOverlay";
import { CompactTableToolbar } from "./CompactTableToolbar";
import { OverlayExtension } from "./CustomExtensions/OverlayExtension";
import { useState, useEffect, useRef, useCallback } from "react";
import { InputRule } from "@tiptap/core";
import {
  convertMarkdownToHtml,
  convertHtmlToMarkdownUnified,
} from "@/app/_utils/markdown-utils";
import { lowlight } from "@/app/_utils/lowlight-utils";
import Underline from "@tiptap/extension-underline";
import HardBreak from "@tiptap/extension-hard-break";
import { KeyboardShortcuts } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/KeyboardShortcuts";
import { DetailsExtension } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/DetailsExtension";
import { generateCustomHtmlExtensions } from "@/app/_utils/custom-html-utils";
import { useShortcuts } from "@/app/_hooks/useShortcuts";
import { TableSyntax } from "@/app/_types";
import { useSettings } from "@/app/_utils/settings-store";
import { uploadFile } from "@/app/_server/actions/upload";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { MAX_FILE_SIZE } from "@/app/_consts/files";

const getImageFromClipboard = (items: DataTransferItemList): File | null => {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  return null;
};

const getFileFromClipboard = (items: DataTransferItemList): File | null => {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      return item.getAsFile();
    }
  }
  return null;
};


type TiptapEditorProps = {
  content: string;
  onChange: (content: string, isMarkdownMode: boolean) => void;
  tableSyntax?: TableSyntax;
};

export const TiptapEditor = ({
  content,
  onChange,
  tableSyntax,
}: TiptapEditorProps) => {
  const { user, appSettings } = useAppMode();

  let output = content;
  if (user?.notesDefaultEditor === "markdown") {
    const htmlContent = content;
    output = convertHtmlToMarkdownUnified(
      htmlContent,
      tableSyntax
    );
  }

  const [isMarkdownMode, setIsMarkdownMode] = useState(user?.notesDefaultEditor === "markdown");
  const [markdownContent, setMarkdownContent] = useState(output);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const [showImageResizeOverlay, setShowImageResizeOverlay] = useState(false);
  const [imageResizePosition, setImageResizePosition] = useState({ x: 0, y: 0 });
  const [selectedImageAttrs, setSelectedImageAttrs] = useState<{
    src?: string;
    width?: number;
    height?: number;
  }>({});
  const [showTableContextMenu, setShowTableContextMenu] = useState(false);
  const [tableContextMenuPosition, setTableContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showCompactImageResize, setShowCompactImageResize] = useState(false);
  const [showCompactTableToolbar, setShowCompactTableToolbar] = useState(false);
  const [overlayTargetElement, setOverlayTargetElement] = useState<HTMLElement | null>(null);
  const isInitialized = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const { compactMode } = useSettings();

  useShortcuts([
    {
      code: "KeyM",
      modKey: true,
      shiftKey: true,
      altKey: true,
      handler: () => toggleMode(),
    },
  ]);

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


  const handleFileUpload = useCallback(async (
    file: File,
    editor: any,
    insertCallback: (data: any) => void,
    showProgress: boolean = false
  ): Promise<void> => {

    if (file.size > (appSettings?.maximumFileSize || MAX_FILE_SIZE)) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const maxSizeMB = ((appSettings?.maximumFileSize || MAX_FILE_SIZE) / (1024 * 1024)).toFixed(0);
      const errorMessage = `File is too large. Maximum size is ${maxSizeMB}MB. Your file is ${fileSizeMB}MB.`;

      if (showProgress) {
        setFileSizeError(errorMessage);
        setIsUploading(true);
        setUploadingFileName(file.name);
        setTimeout(() => {
          setIsUploading(false);
          setFileSizeError(null);
          setUploadingFileName(null);
        }, 3000);
      }
      return;
    }

    if (showProgress) {
      setIsUploading(true);
      setUploadError(null);
      setFileSizeError(null);
      setUploadingFileName(file.name);
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadFile(formData);

      if (result.success && result.data) {
        insertCallback(result.data);
        if (showProgress) {
          setTimeout(() => {
            setIsUploading(false);
            setUploadingFileName(null);
          }, 1000);
        }
      } else {
        if (showProgress) {
          setUploadError(result.error || "Upload failed");
          setIsUploading(false);
        } else {
          console.error("Upload failed:", result.error);
        }
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      if (showProgress) {
        setUploadError("Upload failed. Please try again.");
        setIsUploading(false);
      }
    }
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        underline: false,
        link: false,
        listItem: false,
        bulletList: false,
        hardBreak: false,
      }),
      ...generateCustomHtmlExtensions(),
      DetailsExtension,
      KeyboardShortcuts,
      OverlayExtension.configure({
        onImageClick: (position) => {
          setImageResizePosition({ x: position.x, y: position.y });
          setSelectedImageAttrs({
            src: position.element.getAttribute('src') || undefined,
            width: position.element.getAttribute('width') ? parseInt(position.element.getAttribute('width')!) : undefined,
            height: position.element.getAttribute('height') ? parseInt(position.element.getAttribute('height')!) : undefined,
          });
          setOverlayTargetElement(position.element);
          setShowCompactImageResize(true);
        },
        onTableSelect: (position) => {
          setTableContextMenuPosition({ x: position.x, y: position.y });
          setOverlayTargetElement(position.element);
          setShowCompactTableToolbar(true);
        },
      }),
      Underline,
      HardBreak,
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "plaintext",
      }).extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockNodeView);
        },
      }),
      Link.configure({
        openOnClick: false
      }).extend({
        addInputRules() {
          return [
            new InputRule({
              find: /\[([^\]]+)\]\(([^)]+)\)/,
              handler: ({ state, range, match }) => {
                const { tr } = state;
                const start = range.from;
                const end = range.to;
                const text = match[1];
                const href = match[2];

                tr.replaceWith(
                  start,
                  end,
                  state.schema.text(text, [
                    state.schema.marks.link.create({ href }),
                  ])
                );
              },
            }),
          ];
        },
      }),
      Image.configure({
        HTMLAttributes: {},
      }),
      FileAttachmentExtension.configure({
        HTMLAttributes: {
          class: "file-attachment",
        },
      }),
      Table.extend({
        content: "tableRow+",
      }).configure({
        resizable: true,
      }),
      TableRow.extend({
        content: "(tableHeader | tableCell)*",
      }),
      TableHeader.extend({
        content: "block+",
      }),
      TableCell.extend({
        content: "block+",
      }),
      ListItem.extend({
        content: "block+",
      }),
      TaskList,
      TaskItem.extend({
        nested: true,
        content: "block+",
        parseHTML() {
          return [
            {
              tag: 'li[data-type="taskItem"]',
              priority: 51,
              getAttrs: (element: HTMLElement) => {
                if (typeof element === "string") return false;
                const dataChecked = element.getAttribute("data-checked");
                return {
                  checked: dataChecked === "true",
                };
              },
            },
          ];
        },
      }),
      BulletList.extend({
        content: "listItem+",
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      if (!isMarkdownMode) {
        debouncedOnChange(editor.getHTML(), false);
      }
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm px-6 pt-6 pb-12 sm:prose-base lg:prose-lg xl:prose-2xl dark:prose-invert [&_ul]:list-disc [&_ol]:list-decimal [&_table]:border-collapse [&_table]:w-full [&_table]:my-4 [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted [&_th]:font-semibold [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_tr:nth-child(even)]:bg-muted/50 w-full max-w-none focus:outline-none ${compactMode ? "!max-w-[900px] mx-auto" : ""
          }`,
      },
      handleKeyDown: (view, event) => {
        if (!editor) {
          return false;
        }

        const { state } = view;
        const { selection } = state;

        if (event.key === "Tab") {
          if (editor.isActive("listItem") || editor.isActive("taskItem")) {
            event.preventDefault();
            if (event.shiftKey) {
              editor
                .chain()
                .focus()
                .liftListItem("listItem")
                .liftListItem("taskItem")
                .run();
            } else {
              editor
                .chain()
                .focus()
                .sinkListItem("listItem")
                .sinkListItem("taskItem")
                .run();
            }
            return true;
          }

          if (editor.isActive("codeBlock")) {
            event.preventDefault();
            const { from, to, empty } = selection;

            if (empty) {
              if (!event.shiftKey) {
                editor.chain().focus().insertContent("    ").run();
              }
            } else {
              const selectedText = state.doc.textBetween(from, to, "\n");
              const lines = selectedText.split("\n");

              if (event.shiftKey) {
                const newText = lines
                  .map((line) =>
                    line.startsWith("    ")
                      ? line.substring(4)
                      : line.startsWith("\t")
                        ? line.substring(1)
                        : line
                  )
                  .join("\n");
                editor
                  .chain()
                  .focus()
                  .insertContentAt({ from, to }, newText)
                  .run();
              } else {
                const newText = lines.map((line) => "    " + line).join("\n");
                editor
                  .chain()
                  .focus()
                  .insertContentAt({ from, to }, newText)
                  .run();
              }
            }
            return true;
          }
        }

        if (event.key === "Enter") {
          const { $from } = selection;
          if (
            $from.parent.type.name === "listItem" ||
            $from.parent.type.name === "taskItem"
          ) {
            const isEmpty = $from.parent.content.size === 0;
            if (isEmpty) {
              event.preventDefault();
              const tr = state.tr.setBlockType(
                $from.pos,
                $from.pos,
                state.schema.nodes.paragraph
              );
              view.dispatch(tr);
              return true;
            }
          }
        }

        return false;
      },
      handlePaste: (view, event) => {
        const { clipboardData } = event;
        if (!clipboardData || !editor) return false;

        const items = clipboardData.items;
        if (items) {
          const imageFile = getImageFromClipboard(items);
          if (imageFile) {
            event.preventDefault();
            handleFileUpload(imageFile, editor, (data) => {
              if (data.type === "image") {
                editor?.chain().focus().setImage({ src: data.url }).run();
              } else {
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
              }
            });
            return true;
          }

          const file = getFileFromClipboard(items);
          if (file) {
            event.preventDefault();
            handleFileUpload(file, editor, (data) => {
              if (data.type === "image") {
                editor?.chain().focus().setImage({ src: data.url }).run();
              } else {
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
              }
            });
            return true;
          }
        }

        return false;
      },
    },
  });

  const handleImageResize = useCallback((width: number | null, height: number | null) => {
    if (editor && selectedImageAttrs.src) {
      const { state, view } = editor;

      let imagePos = -1;
      state.doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.src === selectedImageAttrs.src) {
          imagePos = pos;
          return false;
        }
      });

      if (imagePos !== -1) {
        const imageNode = state.doc.nodeAt(imagePos);
        if (imageNode) {
          const newAttrs = { ...imageNode.attrs };

          if (width && width > 0) {
            newAttrs.width = width;
          } else {
            delete newAttrs.width;
          }

          if (height && height > 0) {
            newAttrs.height = height;
          } else {
            delete newAttrs.height;
          }

          const tr = state.tr.setNodeMarkup(imagePos, undefined, newAttrs);
          view.dispatch(tr);
        }
      }
    }
    setShowCompactImageResize(false);
  }, [editor, selectedImageAttrs.src]);

  const handleImageClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'IMG') {
      event.preventDefault();
      event.stopPropagation();

      const rect = target.getBoundingClientRect();
      setImageResizePosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });

      setSelectedImageAttrs({
        src: target.getAttribute('src') || undefined,
        width: target.getAttribute('width') ? parseInt(target.getAttribute('width')!) : undefined,
        height: target.getAttribute('height') ? parseInt(target.getAttribute('height')!) : undefined,
      });

      setShowImageResizeOverlay(true);
    }
  }, []);

  const handleTableContextMenu = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('table') || target.closest('td') || target.closest('th')) {
      event.preventDefault();
      event.stopPropagation();

      setTableContextMenuPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setShowTableContextMenu(true);
    }
  }, []);

  useEffect(() => {
    if (editor && !isInitialized.current) {
      isInitialized.current = true;
      setTimeout(() => {
        const htmlContent = convertMarkdownToHtml(content);
        editor.commands.setContent(htmlContent);
      }, 0);
    }
  }, [editor, content]);

  useEffect(() => {
    if (editor) {
      const editorElement = editor.view.dom;
      editorElement.addEventListener('contextmenu', handleTableContextMenu);

      return () => {
        editorElement.removeEventListener('contextmenu', handleTableContextMenu);
      };
    }
  }, [editor, handleTableContextMenu]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (target.closest('[data-overlay]')) {
        return;
      }

      if (target.tagName === 'INPUT' || target.tagName === 'BUTTON') {
        return;
      }

      setShowCompactImageResize(false);
      setShowCompactTableToolbar(false);
      setShowTableContextMenu(false);
    };

    if (showCompactImageResize || showCompactTableToolbar || showTableContextMenu) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCompactImageResize, showCompactTableToolbar, showTableContextMenu]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setMarkdownContent(newContent);
    debouncedOnChange(newContent, true);
  };

  const toggleMode = () => {
    if (isMarkdownMode) {
      setTimeout(() => {
        if (editor) {
          const htmlContent = convertMarkdownToHtml(markdownContent);
          editor.commands.setContent(htmlContent, { emitUpdate: false });
          setIsMarkdownMode(false);
        }
      }, 0);
    } else {
      setTimeout(() => {
        if (editor) {
          const htmlContent = editor.getHTML();
          const markdownOutput = convertHtmlToMarkdownUnified(
            htmlContent,
            tableSyntax
          );
          setMarkdownContent(markdownOutput);
          setIsMarkdownMode(true);
        }
      }, 0);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-background border-b border-border px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <TiptapToolbar
          editor={editor}
          isMarkdownMode={isMarkdownMode}
          toggleMode={toggleMode}
        />
      </div>

      <UploadOverlay
        isVisible={isUploading || !!uploadError || !!fileSizeError}
        isUploading={isUploading}
        uploadError={uploadError || fileSizeError || undefined}
        fileName={uploadingFileName || undefined}
        onRetry={() => {
          setUploadError(null);
          setFileSizeError(null);
          setIsUploading(false);
        }}
      />

      {isMarkdownMode ? (
        <div
          className="flex-1 p-4 overflow-y-auto h-full"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();

            const files = Array.from(e.dataTransfer.files) as File[];

            if (files.length > 0) {
              files.forEach((file) => {
                handleFileUpload(file, editor, (data) => {
                  if (data.type === "image") {
                    const markdownImage = `![${data.fileName}](${data.url})`;
                    const newContent = markdownContent + "\n" + markdownImage;
                    setMarkdownContent(newContent);
                    debouncedOnChange(newContent, true);
                  } else {
                    const markdownLink = `[📎 ${data.fileName}](${data.url})`;
                    const newContent = markdownContent + "\n" + markdownLink;
                    setMarkdownContent(newContent);
                    debouncedOnChange(newContent, true);
                  }
                }, true);
              });
            }
          }}
        >
          <textarea
            value={markdownContent}
            onChange={handleMarkdownChange}
            className="w-full h-full bg-background text-foreground resize-none focus:outline-none focus:ring-none p-2"
            placeholder="Write your markdown here..."
          />
        </div>
      ) : (
        <div
          className="flex-1 overflow-y-auto"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();

            const files = Array.from(e.dataTransfer.files) as File[];

            if (files.length > 0) {
              files.forEach((file) => {
                handleFileUpload(file, editor, (data) => {
                  if (data.type === "image") {
                    editor?.chain().focus().setImage({ src: data.url }).run();
                  } else {
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
                  }
                }, true);
              });
            }
          }}
        >
          <EditorContent editor={editor} className="w-full h-full" />
        </div>
      )}

      <CompactImageResizeOverlay
        isVisible={showCompactImageResize}
        position={imageResizePosition}
        onClose={() => setShowCompactImageResize(false)}
        onResize={handleImageResize}
        currentWidth={selectedImageAttrs.width}
        currentHeight={selectedImageAttrs.height}
        imageUrl={selectedImageAttrs.src}
        targetElement={overlayTargetElement || undefined}
      />

      {editor && (
        <>
          <CompactTableToolbar
            editor={editor}
            isVisible={showCompactTableToolbar}
            position={tableContextMenuPosition}
            targetElement={overlayTargetElement || undefined}
          />
        </>
      )}
    </div>
  );
};
