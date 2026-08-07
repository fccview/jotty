import { Editor } from "@tiptap/react";
import { Fragment, Slice } from "@tiptap/pm/model";

interface ClipboardImage {
  marker: string;
  attrs: {
    src: string;
    alt: string | null;
    title: string | null;
    style: string | null;
  };
}

interface PlainTextPasteContent {
  text: string;
  images: ClipboardImage[];
  hasText: boolean;
}

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

const getPlainTextPasteContent = (
  clipboardData: DataTransfer
): PlainTextPasteContent | null => {
  const html = clipboardData.getData("text/html");
  if (!html) return null;

  const document = new DOMParser().parseFromString(html, "text/html");
  const hasText = Boolean(document.body.textContent?.trim());
  const images: ClipboardImage[] = [];

  document.body.querySelectorAll("img[src]").forEach((element, index) => {
    const src = element.getAttribute("src");
    if (!src) return;

    const marker = `JOTTY_PASTED_IMAGE_${Date.now()}_${index}`;
    images.push({
      marker,
      attrs: {
        src,
        alt: element.getAttribute("alt"),
        title: element.getAttribute("title"),
        style: element.getAttribute("style"),
      },
    });
    element.replaceWith(`\n${marker}\n`);
  });

  document.body.querySelectorAll("br").forEach((element) => {
    element.replaceWith("\n");
  });
  document.body
    .querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6, blockquote, tr")
    .forEach((element) => {
      element.append("\n");
    });

  return {
    text: (document.body.textContent || "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\n+|\n+$/g, ""),
    images,
    hasText,
  };
};

const pastePlainTextWithImages = (
  view: any,
  content: PlainTextPasteContent
): boolean => {
  const { state } = view;
  const paragraph = state.schema.nodes.paragraph;
  const image = state.schema.nodes.image;
  if (!paragraph || !image) return false;

  const imageByMarker = new Map(
    content.images.map((clipboardImage) => [
      clipboardImage.marker,
      clipboardImage.attrs,
    ])
  );
  const marks = state.selection.$from.marks();
  const nodes = content.text.split(/(?:\r\n?|\n)+/).map((block: string) => {
    const imageAttrs = imageByMarker.get(block);
    if (imageAttrs) return image.create(imageAttrs);

    return paragraph.create(
      null,
      block ? state.schema.text(block, marks) : undefined
    );
  });

  const slice = Slice.maxOpen(Fragment.fromArray(nodes), true);
  const transaction = state.tr
    .replaceSelection(slice)
    .scrollIntoView()
    .setMeta("paste", true)
    .setMeta("uiEvent", "paste");

  view.dispatch(transaction);
  return true;
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
    return true;
  }

  const selectedText = state.doc.textBetween(from, to, "\n");
  const lines = selectedText.split("\n");
  let newText: string;

  if (event.shiftKey) {
    newText = lines
      .map((line: string) =>
        line.startsWith("    ")
          ? line.substring(4)
          : line.startsWith("\t")
            ? line.substring(1)
            : line
      )
      .join("\n");
  } else {
    newText = lines.map((line: string) => "    " + line).join("\n");
  }

  const tr = state.tr.replaceWith(from, to, state.schema.text(newText));
  const newTo = from + newText.length;
  const newSelection = state.selection.constructor.create(tr.doc, from, newTo);
  tr.setSelection(newSelection);
  editor.view.dispatch(tr);

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
  ) => Promise<void>,
  removePasteFormatting = false
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

    const plainTextContent = removePasteFormatting
      ? getPlainTextPasteContent(clipboardData)
      : null;
    const imageFile = getImageFromClipboard(items);
    const file = imageFile ? null : getFileFromClipboard(items);
    if (
      plainTextContent &&
      plainTextContent.images.length > 0 &&
      (plainTextContent.hasText || (!imageFile && !file)) &&
      pastePlainTextWithImages(view, plainTextContent)
    ) {
      event.preventDefault();
      return true;
    }

    if (imageFile) {
      event.preventDefault();
      handleFileUpload(imageFile, insertCallbacks, false);
      return true;
    }

    if (file) {
      event.preventDefault();
      handleFileUpload(file, insertCallbacks, false);
      return true;
    }

    if (removePasteFormatting) {
      const text =
        clipboardData.getData("text/plain") || plainTextContent?.text || "";
      if (!text) return false;

      event.preventDefault();
      return view.pasteText(text);
    }

    return false;
  };
};
