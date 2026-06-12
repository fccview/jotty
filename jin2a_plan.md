# jin2a suggestions - outstanding work

Discord thread: jin2a_ (30-31 May 2026). Items already shipped this session are marked.

---

## Done this session

- **Right-hand column dropdown** - KanbanCard three-dots menu now detects viewport edge and flips left. Fixed in `Dropdown.tsx`.
- **Date picker year jump** - custom `CaptionLabel` with a year `<select>` replaces the plain caption label. Nav arrows untouched. Fixed in `DatePicker.tsx`.
- **Relative reminder dates** - "N days before due date" mode added to the Kanban item reminder field. Toggle UI in `KanbanCardDetailProperties`, logic in `KanbanCardDetail`. `KanbanReminder` extended with `offsetDays?: number`. Reminder datetime is recomputed automatically when target date changes.
- **Click anywhere on checklist card** - All three card variants now have `onClick` on the inner visual surface (not the DnD outer wrapper), so clicks register everywhere. `onPointerDown` / `onMouseDown` on the same inner div stop DnD from activating on clicks. Pin buttons already had `stopPropagation`. `ChecklistCard.tsx`, `ChecklistGridItem.tsx`, `ChecklistListItem.tsx`.
- **Hide time tracking** - Per-user toggle in Kanban settings. New `hideTimeTracking?: HideTimeTracking` field on `User`, added to `kanbanSettingsSchema`, `UserPreferencesTab` (settings UI + save). `KanbanCard` wraps timer and time-entries accordion in `{!hideTimeTracking && ...}`. i18n keys added to all 14 locales.

---

## Medium - do these next

### ~~Click anywhere on a checklist card to open it~~ - DONE

### Export checklist as note
User request: export all tasks and subtasks as a bulleted markdown list, including the description field for Kanban items.  
- Add a server action that reads the checklist JSON and serialises items to markdown bullets (indent subtasks).
- Add a button to the checklist header / three-dots menu.
- The new note lands in `data/notes/<username>/` with a generated title and standard frontmatter.
- Follow `file-persistence.md` and `notes.md` howtos, call `broadcast()` after write.

### ~~Hide time tracking in Kanban item detail~~ - DONE

---

## Hard - plan carefully before starting

### Copy formatting (Tiptap)
Click on formatted text to pick up its formatting, then apply it to a selection. fccview loved this idea.  
- Needs a Tiptap extension that stores the active marks of a clicked node, then applies them to the next selection.
- A "paint bucket" cursor mode toggled from the toolbar.
- This is non-trivial Tiptap extension work - read `notes.md` howto first, look at the existing toolbar and extension setup before touching anything.

### Repeat-last-format ("redo formatting")
Apply the most recently used formatting to a new selection. fccview noted this could reuse the copy-formatting infrastructure once that lands.  
- Depends on copy formatting being implemented first.
- A keyboard shortcut (e.g. Cmd+Shift+R or a toolbar button) that replays the stored mark set from the copy-formatting extension onto the current selection.

### Move item between checklists (menu-driven first, DnD later)
fccview confirmed: implement as "Move to -> pick list -> confirm" menu first, DnD between boards later.  
- Add a "Move to..." option in the Kanban item three-dots menu and in the simple checklist item context menu.
- Server action: remove item from source checklist, append to target, persist both, call `broadcast()` twice.
- The item index path (dot-notation) needs to be re-generated for the target list.
- DnD between boards is a separate, harder task - skip for now.

### Reorder subtasks via drag-and-drop
@reniko was already working on this - check open PRs before starting.  
- DnD within nested items using `@dnd-kit`. The existing flat-item DnD in `ChecklistItemsWrapper.tsx` / `Droppable.tsx` is the reference.
- Nested items use dot-notation index paths; reorder needs to rebuild those paths after every move.
- The `reorderItems` server action already exists - the gap is purely in the client DnD wiring for nested items.

---

## Notes / already fixed upstream

- Hidden 9th subtask (no scrollbar in Firefox) - fccview confirmed fixed, ships next release.
- Sort order preserved on checklist rename - fccview confirmed fixed, ships next release.
- Recurring tasks for Kanban (not just lists) - beta recurring list feature exists in settings; full Kanban recurrence is unplanned.
- All tasks by priority (global filter) - explicitly ruled out due to file-based architecture and scale concerns.
