# Server Actions

Domain folders under `app/_server/actions/<domain>/`. `"use server"` is the first line of a file that exports an action. Re-export from that folder's `index.ts` so imports stay flat: `from "@/app/_server/actions/note"`.

## Shape

```ts
"use server";

import { getCurrentUser } from "@/app/_server/actions/users";
import { canReach } from "@/app/_server/actions/share/queries";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { PermissionTypes, ItemTypes } from "@/app/_types/enums";
import type { Result } from "@/app/_types";

export const updateThing = async (uuid: string, formData: FormData): Promise<Result<Thing>> => {
  const user = await getCurrentUser();
  if (!user?.username) return { success: false, error: "Not authenticated" };

  const allowed = await canReach(uuid, ItemTypes.NOTE, user.username, PermissionTypes.EDIT);
  if (!allowed) return { success: false, error: "Permission denied" };

  try {
    const data = await _write(uuid, formData);
    await broadcast({
      type: "note",
      action: "updated",
      entityId: uuid,
      username: user.username,
    });
    return { success: true, data };
  } catch (error) {
    console.error("updateThing failed:", error);
    return { success: false, error: "Failed to update" };
  }
};
```

Return `Result<T>` on new actions. Neighbours sometimes return `{ error }` without `success: false`. Match the file you are in, do not "fix" the whole module to be strict. Do not throw across the action boundary as normal control flow. Log in the catch.

## Auth first, then permission

`getCurrentUser()` from `app/_server/actions/users`. That is the actor.

`claimedName(formData)` in `lib/actor.ts` reads a leftover `user` blob the client still sends. If it disagrees with the session, refuse. It is never how you decide who is acting.

A mutation without a permission check is the first thing review looks for. Items: `canReach(uuid, itemType, username, permission)`. Folders you are about to create in: `targetDir` then `bouncer`. Client-side `PermissionsProvider` only hides buttons.

`canAccessAllContent()` is the admin peek, gated by settings. It is not a substitute for `canReach` on a write.

## Writes

1. Resolve the item by uuid.
2. Check permission against that file, not against a category the client sent.
3. Write through the existing file helpers.
4. Update the link index if content or identity-adjacent metadata changed.
5. `broadcast()` after the write succeeds.
6. `revalidatePath` if the neighbouring action already does.

`broadcast` lives at `app/_server/actions/ws/broadcast.ts`. Event shape:

```ts
{ type: "checklist" | "note" | "category" | "settings" | "sharing" | "notification",
  action: "created" | "updated" | "deleted",
  entityId?: string,  // uuid
  username: string }
```

Forgetting `broadcast()` leaves the phone and the laptop looking at different ticks. Do not broadcast from the client. Do not broadcast before the write.

`WebSocketProvider` receives the event and calls `router.refresh()` after a short debounce. It does not patch `AppModeProvider` in place. While the editor is active it queues the refresh and fires it when editing stops. No optimistic updates. Wait, broadcast, let the other tabs refresh.

## FormData

`getFormData(formData, keys)` in `global-utils` is the usual extractor. Zod schemas exist for sharing, users, and MFA in `app/_schemas/`. Use them where they already sit. Do not invent a schema module for a neighbour that takes FormData and a uuid.

## Naming

Exported actions are verbs: `createNote`, `updateItem`. Helpers that stay in the file start with `_`.

Look at the neighbouring create/update/delete in the same folder before you add a new file. Most of the time the missing piece is a flag or a uuid argument on an action that already exists.
