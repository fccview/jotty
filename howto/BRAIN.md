# Links and the Brain

Notes and checklists can link to each other. Every link works both ways: the item you link to lists the item that links to it under **Referenced By**. The **Brain** draws all of those links as a map you can explore.

---

## Making a link

There are three ways, and you can mix them freely.

| How | What you type | What gets saved |
| --- | --- | --- |
| Mention | `@` then pick an item | `[Title](/note/<uuid>)` |
| Wikilink picker | `[[` then pick an item | `[Title](/note/<uuid>)` |
| Wikilink | `[[Title]]` typed out in full | `[[Title]]`, exactly as you typed it |

Links made with the picker point at the item's id, so nothing you do to the item later can break them. Wikilinks are for people who like typing them out, and for notes brought over from Obsidian.

Wikilinks understand the usual extras:

- `[[Title|shown text]]` shows different text
- `[[Title#Heading]]` points at a heading
- `[[Title]]` for a note that doesn't exist yet shows a dashed button. Click it to create the note.

---

## How wikilinks find their note

A wikilink is matched by title, ignoring upper and lower case and extra spaces, against your own notes and checklists.

- **The first match sticks.** Once `[[Plan]]` has found a note, it keeps pointing at that note. A new note called "Plan" later on doesn't take the link over.
- **Two items with the same title.** The link goes to the older one.
- **Renaming the target.** The link keeps working. The next time you save the note that contains the link, Jotty updates the text to the new title, so `[[Plan]]` becomes `[[Q3 plan]]`. Headings and shown text are kept. Only the note you are saving changes. Other notes catch up when they are next saved, and their links keep working until then.
- **Pointing a link somewhere else.** Edit the text inside `[[ ]]` and save. Different text is looked up again.
- **Deleting the target.** Links move to the next item with that title, or become a "not written yet" button.

Wikilinks inside code blocks and inline code are left alone.

---

## Mentioned in

Below **Referenced By**, a **Mentioned in** list shows notes that contain this item's title as plain text but don't link to it yet. Press **Link** to turn the first plain mention in that note into a link. Nothing else in the note changes.

Titles shorter than three characters are skipped, because they would match almost everything.

---

## Importing from Obsidian

Copy your vault's Markdown files into a category and Jotty picks them up. The body of each note is left exactly as it was: `[[wikilinks]]` are read, never rewritten on import.

Jotty adds two lines to each file's frontmatter the first time it sees it:

- `uuid`, the id Jotty uses for the note's address
- `createdAt`, so the note keeps its creation date

Wikilinks are only rewritten when you rename a note in Jotty and then save a note that links to it, as described above.

---

## The Brain

Open it with the brain button at the top of any note or checklist. The item you came from is highlighted.

- **3D and 2D.** 3D is the default on devices that handle it. Phones, tablets and anyone with reduced motion turned on get 2D.
- **Click** a node to select it and see its links. **Double click** opens it. Right click opens it too.
- **Search** jumps to an item.
- **Around this item** shows just the part of the map around the item you came from, with a depth slider. **Everything** shows the whole map again.
- **Colour by** type or by category.
- **Filters** show or hide notes, checklists, tags, "not written yet" items, suggestions and items with no links.
- **Suggestions** are dashed lines between items that share a lot of neighbours but don't link to each other yet. They are listed as **Might be related** when you select an item, and on your own brain the link button next to one connects them.

Node shapes:

| Shape | Meaning |
| --- | --- |
| Circle with a note icon | Note |
| Rounded square with a checklist icon | Checklist |
| Rounded square with a task icon | Kanban board |
| Diamond | Tag |
| Dashed circle | A wikilink to a note that doesn't exist yet |

Admins can open `/brain/<username>` to see another user's brain when **Admin Content Access** is turned on in the admin settings.

Turning off **Bilateral Links** in the admin editor settings hides the brain, Referenced By and Mentioned in.

---

## The relationships index

Jotty keeps the links in `data/.relations.db`, next to your notes. Your Markdown files stay the source of truth. The index holds the links, the titles, and a searchable copy of each unencrypted note's plain text, which powers **Mentioned in**.

- Encrypted notes are never read. Their links don't appear anywhere.
- If the file is missing or damaged, Jotty rebuilds it from your notes on start. While that runs, Referenced By and the Brain show "Indexing relationships...".
- Files changed outside Jotty are picked up within about a minute.
- Admins can rebuild it from **Admin > Content**, or with the [rebuild API](API.md#15-rebuild-link-index).

A rebuild keeps track of which note each wikilink first matched. Deleting the file loses that: wikilinks whose target was renamed in Jotty, in notes not saved since, then fall back to matching by title.
