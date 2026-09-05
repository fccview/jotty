# REST API

Published contract. People hit this with an API key from scripts, shortcuts, and home automations. They do not read the changelog.

Adding a field is safe. Renaming one, dropping one, changing a type, or changing what a status value means will break somebody's morning.

Operator docs: `howto/API.md`.

## Auth

Wrap every authenticated route with `withApiAuth` from `app/_utils/api-utils.ts`. It reads `x-api-key`, resolves the user, returns 401 on failure.

```ts
import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    // user.username is the actor
    return NextResponse.json({ success: true, data: [] });
  });
}
```

Do not read the session cookie in an API route. API keys and browser sessions are different doors.

Health (`/api/health`) and public GETs that already exist are the exceptions. Do not add a new unauthenticated item route.

## Identity

Path ids are uuids. Response `id` is the uuid. `howto/API.md` says so in so many words.

```ts
const note = await getNoteById(uuid, user.username);
return NextResponse.json({
  success: true,
  data: {
    id: note.uuid,
    title: note.title,
    category: note.category,
    content: note.content,
  },
});
```

`listUuid(request, param, username)` still resolves a slug plus `?category=` and logs a deprecation warning. Notes has the same leftover as `_noteUuid`. New routes take a uuid and 404. Do not spread that fallback.

## Shape

Call into Server Actions. Do not reimplement file I/O in `route.ts`.

`export const dynamic = "force-dynamic"` on item routes.

Return `NextResponse.json` with an explicit status on error. 401 from the wrapper, 404 when the uuid resolves to nothing the actor can see, 403 when you want to distinguish permission from absence (match the neighbouring route, do not invent a third mapping).

## Checklist items vs lists

`/api/checklists/[listId]` is the list, by uuid.

`/api/checklists/[listId]/items/[itemIndex]` uses a tree index (`0`, `0.1`) for position inside that list. Kanban item routes use the card's `itemId`. Do not "fix" the checklist indexes to uuids unless the published docs change. Do not address the list itself by category+slug.

## Query params

List filters may include `category` as a folder filter. That is "show me items in this folder", not "this is the item". Coalesce `searchParams.get` from `string | null` to `undefined` before passing down.
