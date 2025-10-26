import { Editor } from "@tiptap/react";

export const getImageFromClipboard = (
  items: DataTransferItemList
): File | null => {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  return null;
};

export const getFileFromClipboard = (
  items: DataTransferItemList
): File | null => {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      return item.getAsFile();
    }
  }
  return null;
};

export const handleTabInCodeBlock = (
  editor: Editor,
  event: KeyboardEvent,
  state: any,
  selection: any
): boolean => {
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
        .map((line: string) =>
          line.startsWith("    ")
            ? line.substring(4)
            : line.startsWith("\t")
            ? line.substring(1)
            : line
        )
        .join("\n");
      editor.chain().focus().insertContentAt({ from, to }, newText).run();
    } else {
      const newText = lines.map((line: string) => "    " + line).join("\n");
      editor.chain().focus().insertContentAt({ from, to }, newText).run();
    }
  }
  return true;
};

export const handleTabInList = (
  editor: Editor,
  event: KeyboardEvent
): boolean => {
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
};

export const handleEnterInEmptyListItem = (
  state: any,
  view: any,
  selection: any
): boolean => {
  const { $from } = selection;
  if (
    $from.parent.type.name === "listItem" ||
    $from.parent.type.name === "taskItem"
  ) {
    const isEmpty = $from.parent.content.size === 0;
    if (isEmpty) {
      const tr = state.tr.setBlockType(
        $from.pos,
        $from.pos,
        state.schema.nodes.paragraph
      );
      view.dispatch(tr);
      return true;
    }
  }
  return false;
};

export const createKeyDownHandler = (editor: Editor | null) => {
  return (view: any, event: KeyboardEvent) => {
    if (!editor) return false;

    const { state } = view;
    const { selection } = state;

    if (event.key === "Tab") {
      if (editor.isActive("listItem") || editor.isActive("taskItem")) {
        return handleTabInList(editor, event);
      }

      if (editor.isActive("codeBlock")) {
        return handleTabInCodeBlock(editor, event, state, selection);
      }
    }

    if (event.key === "Enter") {
      return handleEnterInEmptyListItem(state, view, selection);
    }

    return false;
  };
};

export const createPasteHandler = (
  editor: Editor | null,
  handleFileUpload: (
    file: File,
    callbacks: any,
    showProgress?: boolean
  ) => Promise<void>
) => {
  return (view: any, event: ClipboardEvent) => {
    const { clipboardData } = event;
    if (!clipboardData || !editor) return false;

    const items = clipboardData.items;
    if (!items) return false;

    const insertCallbacks = {
      onImageUpload: (url: string) => {
        editor?.chain().focus().setImage({ src: url }).run();
      },
      onFileUpload: (data: any) => {
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
    };

    const imageFile = getImageFromClipboard(items);
    if (imageFile) {
      event.preventDefault();
      handleFileUpload(imageFile, insertCallbacks, false);
      return true;
    }

    const file = getFileFromClipboard(items);
    if (file) {
      event.preventDefault();
      handleFileUpload(file, insertCallbacks, false);
      return true;
    }

    return false;
  };
};
