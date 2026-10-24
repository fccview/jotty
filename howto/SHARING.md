# Sharing

You can share a single note or checklist, or a whole folder, with other people on your instance. You can also share it with anyone who has the link.

Shared things stay in your folder. The people you share with see them in their own sidebar, but there is only one copy and you still own it.

To share an item, open its menu and pick **Share**. To share a folder, open the folder's menu in the sidebar and pick **Share this folder**.

---

## What each permission does

Everybody you add can open what you shared. The buttons next to their name add more on top of that.

On a note or checklist:

| Button | They can |
| --- | --- |
| Edit | Change the content and the title |
| Delete | Delete it. Turning this on also turns on Edit |

On a folder, the permissions apply to everything inside it:

| Button | They can |
| --- | --- |
| Create | Add new items to the folder and move items into it |
| Edit | Change the items in the folder |
| Delete | Delete the items in the folder |

If you turn every button off, they can still read. To take their access away completely, use the **Remove access** button at the end of their row.

### Create without edit

New items in a folder follow that folder's permissions, even when somebody else made them. So if you give somebody Create but not Edit, they can add a note to your folder but can't change it afterwards. That works well for a drop box. If you want them to keep working on what they add, give them Edit as well.

---

## Items inside a shared folder

An item in a shared folder uses the folder's sharing by default. The share window for that item shows a **Use the folder's sharing** switch.

- **Switch on.** The item has the same people and permissions as the folder. The list is greyed out, and if you change who the folder is shared with, this item changes too.
- **Switch off.** The item gets its own list, starting as a copy of the folder's. Nobody gains or loses access at that moment. After that you can add people, remove people or change their permissions for this item only, and later changes to the folder no longer reach it.
- **Switch back on.** The item's own list is thrown away and it uses the folder's again.

To keep one item in a shared folder private, turn the switch off, then press **Stop sharing**.

A folder can let somebody delete items without editing them. A single item can't store that, so Jotty won't turn the switch off while somebody on the folder has it. Give them Edit on the folder as well, or take Delete away, then try again.

---

## Public links

**Public access** gives a link that anyone can open without logging in. Public links are read only.

A public folder link covers everything in the folder, including anything you add later.

---

## Leaving a share

If somebody shared something with you and you don't want it, open its menu and pick **Leave share**. It disappears from your sidebar. To get it back, the owner has to share it with you again.

---

## Sharing through the API

The REST API can share and unshare single items. See the API guide for the details. Sharing an item that uses its folder's sharing gives that item its own list, starting with the folder's people.
