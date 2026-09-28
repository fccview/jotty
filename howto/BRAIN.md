# Links and the brain

Notes and checklists can link to each other, and every link works both ways. The item you link to lists the item that links to it under **Referenced By**. The **Brain** draws all of those links as a map you can click around in.

---

## Making a link

There are three ways, and you can mix them in the same note.

| How | What you type | What gets saved |
| --- | --- | --- |
| Mention | `@` then pick an item | `[Title](/note/<uuid>)` |
| Wikilink picker | `[[` then pick an item | `[Title](/note/<uuid>)` |
| Wikilink | `[[Title]]` typed out in full | `[[Title]]`, exactly as you typed it |

Links made with the picker point at the item's id, so renaming or moving the item later won't break them. Wikilinks are for people who like typing them out, and for notes brought over from Obsidian.

Wikilinks understand the usual extras:

- `[[Title|shown text]]` shows different text
- `[[Title#Heading]]` points at a heading
- `[[Title]]` for a note that doesn't exist yet shows a dashed button. Click it to create the note.

---

## How wikilinks find their note

Jotty matches a wikilink by title against your own notes and checklists. Case and extra spaces don't matter.

- **The first match sticks.** Once `[[Plan]]` has found a note, it keeps pointing at that note. A new note called "Plan" later on doesn't take the link over.
- **Two items with the same title.** The link goes to the older one.
- **Renaming the target.** The link keeps working. The next time you save the note that contains the link, Jotty updates the text to the new title, so `[[Plan]]` becomes `[[Q3 plan]]`. Headings and shown text are kept. Only the note you are saving changes. Other notes catch up when they are next saved, and their links keep working until then.
- **Pointing a link somewhere else.** Edit the text inside `[[ ]]` and save. Jotty looks up the new text again.
- **Deleting the target.** Links move to the next item with that title, or become a "not written yet" button.

Wikilinks inside code blocks and inline code are left alone.

---

## Mentioned in

Below **Referenced By**, a **Mentioned in** list shows notes that contain this item's title as plain text but don't link to it yet. Press **Link** to turn the first plain mention in that note into a link. Nothing else in the note changes.

Titles shorter than three characters are skipped, because they would match almost everything.

---

## Importing from Obsidian

Copy your vault's Markdown files into a category and Jotty picks them up. Jotty reads the `[[wikilinks]]` in each note but never rewrites the body on import.

Jotty adds two lines to each file's frontmatter the first time it sees it:

- `uuid`, the id Jotty uses for the note's address
- `createdAt`, so the note keeps its creation date

After that, a wikilink only gets rewritten when you rename a note in Jotty and then save a note that links to it, as described above.

---

## The brain

Open it with the brain button at the top of any note or checklist. The item you came from is highlighted.

- **3D and 2D.** 3D is the default on devices that can handle it. Phones, tablets and anyone with reduced motion turned on get 2D.
- Click a node to select it and see its links. Double click or right click opens it.
- **Search** jumps to an item.
- **Around this item** shows only the part of the map near the item you came from, with a depth slider. **Everything** shows the whole map again.
- **Colour by** type or by category.
- **Filters** show or hide notes, checklists, tags, "not written yet" items, suggestions and items with no links.
- **Suggestions** are dashed lines between items that share a lot of neighbours but don't link to each other yet. When you select an item they're listed under **Might be related**, and on your own brain the link button next to one connects the two.

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

## Search

The search bar uses the same index. It finds the words in any order, so "curry weeknight" finds a note called "Weeknight curry", and it puts the best matches first. A title match counts most, then tags and the text itself. Checklist items and link text are searched too.

You can change how it works under **Search** in your preferences:

| Setting | What it does |
| --- | --- |
| Best matches first, then exact text | The default. Ranked matches come first, then anything the ranked search missed that contains exactly what you typed. |
| Best matches only | Only the ranked matches. Part of a word, like "ann" for "planning", won't match. |
| Exact text only | The characters exactly as you typed them, anywhere in the file, in no particular order. This is how search worked before the index. |

> [!TIP]
> While Jotty builds the index on first start, the default setting falls back to exact text, so search keeps working. With **Best matches only**, the search box shows "Indexing your notes" until the index is ready.

---

## The relationships index

Jotty keeps the links in `data/.relations.db`, next to your notes. Your Markdown files are still the source of truth. The index holds the links, the titles, and a searchable copy of each unencrypted note and checklist, which is what search and **Mentioned in** use.

- Jotty never reads encrypted notes, so their links don't appear anywhere and search only finds them by exact text.
- If the file is missing or damaged, Jotty rebuilds it from your notes on start. While that runs, Referenced By and the brain show "Indexing relationships...".
- Files changed outside Jotty are picked up within about a minute.
- Anyone can rebuild their own index with the rebuild route in the [API](API.md). Admins can also rebuild another user's, or everyone's from **Admin > Content**.

> [!NOTE]
> A rebuild remembers which note each wikilink first matched. Deleting the file forgets that. Wikilinks whose target you renamed in Jotty, sitting in notes you haven't saved since, go back to matching by title.

---

## From the API and MCP

The same links are available with an API key, so scripts and AI assistants can follow them too:

| Route | What it gives you |
| --- | --- |
| `GET /api/relations/{itemId}` | What links to an item, what it links to, unwritten wikilinks, plain mentions and suggestions |
| `GET /api/brain` | The items around one item with `focus`, or the most linked items without it |
| `GET /api/relations/orphans` | Notes and checklists with no links at all |
| `POST /api/relations/links` | Adds a link to a note, at the end or on the first plain mention of the target's title |

Every link comes back with a `kind` that says how it's written:

| Kind | What it is |
| --- | --- |
| `link` | A `[Title](/note/<uuid>)` link on a line of its own, like the ones `POST /api/relations/links` adds at the end |
| `mention` | The same kind of link inside a sentence, like a mention picked with `@` or one the API turned into a link |
| `checklist` | A link inside a checklist item, or inside a `- [ ]` task in a note |
| `wiki` | A `[[Title]]` wikilink |

When one item links another in more than one way, `/api/relations/{itemId}` shows one kind, the first of `mention`, `link`, `checklist` and `wiki`. The brain draws a line for each.

They follow the same rules as the brain. You only see items you can open, linking needs edit access to the note, and encrypted notes are refused. With **Bilateral Links** turned off they answer `404`.
