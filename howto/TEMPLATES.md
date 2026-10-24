# Templates

A template is a note you start other notes from. Meeting notes, a weekly review, a recipe card: write the layout once, then pick it whenever you make a new note.

Templates and the archive both open from the menu under your username, at the top right.

---

## Making a template

There are two ways.

- **From a note you already have.** Open it, open the **...** menu and pick **Save as template**. Jotty copies the note into your templates. The note itself stays where it was.
- **From scratch.** Click **+** next to **Templates** when you create a note, or **New template** on the Templates page. Give it a name and Jotty opens it in the editor.

A template is an ordinary note, so you edit it the same way. Notes you've already made from it don't change when you edit it.

Encrypted notes can't become templates.

---

## Using a template

When you create a note, pick one from the **Templates** dropdown. The **Use** button on the Templates page does the same thing with that template already picked.

If you have quick create turned on, **Use** still opens the create window so you can see which template you're starting from.

You can't encrypt a note while you're making it from a template. Make the note first, then encrypt it.

---

## Placeholders

Two placeholders get filled in when a note is made from a template:

| Placeholder | Becomes |
| --- | --- |
| `{{title}}` | The title you typed for the new note |
| `{{user}}` | Your username |

Spaces inside the braces are fine, so `{{ title }}` works too. Anything else in double braces stays exactly as you wrote it.

---

## Where they live

Templates sit in a `.templates` folder inside your notes folder, next to `.archive`. They don't show up in the sidebar, your note lists, search or the brain, and you can't name a category `.templates`.

Templates are yours. The editor doesn't offer to share them, and nobody else can make a note from one of yours, even if they can read it.
