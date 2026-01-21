import { Extension, KeyboardShortcutCommand } from "@tiptap/core";

export interface KeyboardShortcutsOptions {
  onLinkRequest?: (hasSelection: boolean) => void;
}

export const KeyboardShortcuts = Extension.create<KeyboardShortcutsOptions>({
  name: "keyboardShortcuts",

  addOptions() {
    return {
      onLinkRequest: undefined,
    };
  },

  addKeyboardShortcuts(): Record<string, KeyboardShortcutCommand> {
    return {
      "Mod-b": () => this.editor.chain().focus().toggleBold().run(),
      "Mod-i": () => this.editor.chain().focus().toggleItalic().run(),
      "Mod-u": () => this.editor.chain().focus().toggleUnderline().run(),
      "Mod-Shift-x": () => this.editor.chain().focus().toggleStrike().run(),
      "Mod-e": () => this.editor.chain().focus().toggleCode().run(),
      "Mod-Shift-k": () => {
        if (this.options.onLinkRequest) {
          const { from, to } = this.editor.state.selection;
          const hasSelection = from !== to;
          this.options.onLinkRequest(hasSelection);
        } else {
          const url = window.prompt("URL");
          if (url) {
            this.editor.chain().focus().setLink({ href: url }).run();
          }
        }
        return true;
      },

      "Mod-Alt-1": () =>
        this.editor.chain().focus().toggleHeading({ level: 1 }).run(),
      "Mod-Alt-2": () =>
        this.editor.chain().focus().toggleHeading({ level: 2 }).run(),
      "Mod-Alt-3": () =>
        this.editor.chain().focus().toggleHeading({ level: 3 }).run(),

      "Mod-Shift-8": () => this.editor.chain().focus().toggleBulletList().run(),
      "Mod-Shift-7": () =>
        this.editor.chain().focus().toggleOrderedList().run(),
      "Mod-Shift-9": () => this.editor.chain().focus().toggleTaskList().run(),
      "Mod-Shift-b": () => this.editor.chain().focus().toggleBlockquote().run(),

      "Mod-Alt-c": () => this.editor.chain().focus().toggleCodeBlock().run(),

      Tab: () => {
        if (this.editor.isActive("table")) {
          return this.editor.chain().focus().goToNextCell().run();
        }
        return false;
      },
      "Shift-Tab": () => {
        if (this.editor.isActive("table")) {
          return this.editor.chain().focus().goToPreviousCell().run();
        }
        return false;
      },
      "Mod-r": () => {
        if (this.editor.isActive("table")) {
          return this.editor.chain().focus().addRowAfter().run();
        }
        return false;
      },
      "Shift-Mod-r": () => {
        if (this.editor.isActive("table")) {
          return this.editor.chain().focus().addRowBefore().run();
        }
        return false;
      },
      "Shift-Mod-C": () => {
        if (this.editor.isActive("table")) {
          return this.editor.chain().focus().addColumnAfter().run();
        }
        return false;
      },
      "Mod-Backspace": () => {
        if (this.editor.isActive("table")) {
          return this.editor.chain().focus().deleteRow().run();
        }
        return false;
      },
      "Shift-Mod-Backspace": () => {
        if (this.editor.isActive("table")) {
          return this.editor.chain().focus().deleteColumn().run();
        }
        return false;
      },
    };
  },
});
