---
name: jotty
description: Use when working on Jotty, a Next.js 16 + React 19 TypeScript self-hosted PWA for notes, checklists, and Kanban. Covers coding standards, UUID identity, file persistence, sharing, auth, encryption, i18n, PWA, and tests.
---

# Jotty

Self-hosted notes, checklists, and Kanban. No database. Every item is a file on disk that somebody owns.

`AGENTS.md` is the values file. This skill is the how. Read a reference before you touch the area it covers.

## Identity

**UUID is the only identity.** Category and slug are where the file sits on disk, and that path changes when a user renames or moves something.

Routes, server actions, sharing, indexes, links, broadcasts, and API calls take a uuid. `Note.id` and `Checklist.id` are the on-disk filename. They are marked deprecated. Do not add a new category+slug lookup.

Look up a file with `grepFindFileByUuid`. Link to it with `itemHref(type, uuid)`. Test a param with `isUuid`.

The full rule, the leftover traps, and the helpers live in [identity.md](references/identity.md). Read it if the task touches an item, a category, a route, or an id.

## Before you edit

Map the task and read those files.

| If you are touching… | Read |
|---|---|
| uuids, routes, lookups, `id` vs `uuid` | [identity.md](references/identity.md) |
| `data/`, locks, grep, indexes, paths | [persistence.md](references/persistence.md) |
| Server Actions, `Result`, `broadcast()` | [mutations.md](references/mutations.md) |
| `app/api`, REST contract, API keys | [api.md](references/api.md) |
| shares, mounts, `canReach`, `bouncer` | [sharing.md](references/sharing.md) |
| login, sessions, LDAP, OIDC, MFA | [auth.md](references/auth.md) |
| passphrase, PGP, ciphertext | [encryption.md](references/encryption.md) |
| Tiptap, frontmatter, note history | [notes.md](references/notes.md) |
| lists, Kanban, checklist items, reminders | [checklists.md](references/checklists.md) |
| components, Zustand, i18n, PWA | [ui.md](references/ui.md) |
| Vitest, mocks, security tests | [testing.md](references/testing.md) |

User-facing docs for the person running an instance live in `howto/`. Do not treat those as coding standards.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind 3, Zustand 5, Tiptap 3, `@dnd-kit`, next-intl 4, Zod 4. Auth is a session cookie plus optional LDAP and OIDC. Crypto is OpenPGP 6 and libsodium XChaCha. Tests are Vitest 4, non-concurrent, 30s timeout. Yarn.

## Folder map

```
app/
  api/                         REST. Auth via withApiAuth. Path ids are uuids.
  (loggedInRoutes)/            notes, checklists, kanban, tasks, settings, howto
    note/[uuid]/               canonical note page
    checklist/[uuid]/          canonical checklist page
    note/[...categoryPath]/    301 leftover. Do not copy this pattern.
  (loggedOutRoutes)/           login
  public/note/[uuid]/          public share
  _components/
    FeatureComponents/         Notes, Checklists, Kanban, Sidebar, Admin…
    GlobalComponents/          cards, modals, form elements, Pwa
  _server/actions/             domain folders (note, checklist, share, users…)
    file/                      ensureDir, readJsonFile, serverWriteFile
    lib/                       concurrency, metadata-cache, actor, legacy-lookup
    ws/broadcast.ts            broadcast()
  _providers/                  AppMode, Theme, Toast, Shortcuts, WebSocket
  _hooks/                      useChecklist, useNoteEditor, useShortcuts
  _utils/                      client utils, Zustand stores, grep-utils
  _types/                      Note, Checklist, sharing, Result
  _consts/                     identity, files, sharing, paths
  _schemas/                    Zod for sharing, users, MFA
  _translations/               en.json is the complete one
data/                          runtime files. Real notes live here. Do not tidy them.
howto/                         instance operator docs
tests/                         Vitest. security/ is auth, paths, leakage.
```

File helpers live in `app/_server/actions/file`. The old `_server/lib` path does not exist.

## Commands

```
yarn dev
yarn lint
yarn test path/to/file.test.ts
yarn test:run
yarn mock:data:notes <username>
yarn mock:data:lists <username>
```

Do not run a production build, write to git, or edit the env file unless the message you are answering asked for it.

## Patterns that bite

Server Components fetch. Client Components mutate. Protected pages set `"force-dynamic"`.

Server Actions return `Result<T>` (`{ success, data?, error? }`). Do not throw as control flow.

`AppModeProvider` holds hydrated notes, checklists, user, settings, sharing. Zustand is local UI state only.

After a write that another session should see: wait for the server, `broadcast()`, then `WebSocketProvider` runs `router.refresh()`. No optimistic updates.

`getCurrentUser()` is the session. A username or owner field on the request is not. `claimedName` exists to refuse a mismatch, not to pick an actor.

Category names are user input in a path. Check containment (`isPathSafe`) every time you join one.

English translation keys go in `app/_translations/en.json`. Other locales fall back. Hardcoded UI strings are a bug.

## Conventions

Components are `PascalCase.tsx`. Utils and stores are `kebab-case.ts`. Stores end in `-store.ts` and export `useXxxStore`. Page clients are `<Feature>PageClient.tsx`. Smaller helpers may be `<Feature>Client.tsx`. Do not mix those up.

Imports: React/Next, packages, local actions, local types/utils. `@/` alias.

Arrow functions. Short camelCase names. Constants and enums, not magic strings. No `any`. No comments. Log when you catch.

Keep files small. If you cannot hold it in your head, split it. Look for the neighbouring case before you invent a helper. The permission check is a `bouncer`. Refusing you is a `refusalMessage`.

## Workflow

1. Read `AGENTS.md` if this is a new session.
2. Read mapped references above if you plan on touching any of the areas they reference.
3. Trust the neighbouring code for standards. The name you want is probably already there under a name you would not have picked.
4. Smallest compatible change. Adding a field is safe. Renaming, dropping, or retyping one on the REST API is not.
5. Typecheck, lint what you touched, run the tests for the area. Security tests failing means the change is wrong.
6. Say what you changed, what you left alone on purpose, what you ran, and what still scares you.
