# Sharing and permissions

An item belongs to one user and sits in that user's folder. Everything else is a view onto it.

Shares carry read, write, create, and delete as four separate grants. Somebody who can tick items off a shopping list still cannot delete it.

## Files

Item grants live in the item's YAML as `sharedWith` (`SHARED_WITH_KEY`). Compact codes from `SharePerms`: `r`, `rw`, `rwd`. Public is the user `"public"`. Resolve the file by uuid, then read or patch that field through the share helpers. Do not invent a side table.

Folder grants, folder uuid, and order live in per-folder `.category-info.json`:

```ts
{
  uuid?: string,               // folder identity
  sharing?: {
    users: Record<string, SharingPermissions>,
    inherit: boolean
  },
  order?: { categories?: string[], items?: string[] }  // items are uuids
}
```

Helpers: `readCatInfo`, `writeCatInfo`, `patchCatInfo`, `catUuid`, `catDirByUuid` in `app/_server/actions/share/category-info.ts`. Always go through those. Do not open the JSON from an action.

`.sharing.json` is leftover. Migration still reads it. Do not write it.

## Checks

On an **item**, uuid in hand:

```ts
import { canReach } from "@/app/_server/actions/share/queries";
import { PermissionTypes, ItemTypes } from "@/app/_types/enums";

const ok = await canReach(uuid, ItemTypes.NOTE, username, PermissionTypes.EDIT);
```

`reachableFile` is the same check but returns the path you may write.

On a **folder** you are about to create or drop into:

```ts
const target = await targetDir(Modes.NOTES, username, category);
const verdict = await bouncer(target, username, PermissionTypes.CREATE);
if (!verdict.allowed) return { error: verdict.error };
```

`bouncer` lives in `share/target.ts`. The no is a `refusalMessage`. Owner always passes. Implicit mounts (the "shared-by:alice" virtual pile) do not get create.

Client `PermissionsProvider` and badge components keep buttons from lying. They are not security.

A mutation that trusts `owner` or `category` from the browser is an auth bug even when the UI would never send a bad one.

## Mounts

A mount is how a share appears in the recipient's tree. The file still lives in the owner's folder.

`SharedMount` carries `categoryUuid`, `categoryPath`, `displayName`, `permissions`, and optional `itemUuids`. Resolve mounts with `mountsFor`. When the recipient thinks they are looking at `Alice's recipes/Cake`, `targetDir` maps that display path back to Alice's disk.

Loose shared items (shared as files, not as a folder) group under a virtual `isLoose` category named after the sharer. That folder is not real. Do not try to `mkdir` it.

## Public

`PUBLIC_USER` in sharing consts. Public routes are `/public/note/<uuid>` and `/public/checklist/<uuid>`. Unauthenticated. Resolve by uuid, confirm the public grant, then render. Do not leak owner emails or other users' shares on that page.

## Mutations

Share, unshare, leave, and folder share all take uuids. See `share/operations.ts`. After a grant changes, `broadcast` a `sharing` event so the recipient's sidebar updates. Drop the entry when the item is deleted.

`inherit: true` on a folder means children pick up the grant. A file-level grant still has to be checked. Do not assume folder write implies delete on a child if the child grant is narrower.
