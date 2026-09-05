# Tests

Vitest 4, `tests/setup.ts`, non-concurrent, 30s timeout. `fileParallelism: false`. Do not add `test.concurrent`. File I/O will race.

```
yarn test tests/server-actions/note.test.ts
yarn test:run
yarn test:coverage
```

## Layout

```
tests/
  setup.ts
  api/                 route behaviour
  server-actions/      actions, including sharing and legacy-lookup
  security/            auth, path containment, data leakage
  utils/
  mock-data/           generators, not fixtures committed from data/
```

Security tests are not optional colour. If your change makes one fail, the change is wrong until proven otherwise. If you changed behaviour they cover, update them and say so.

## Mocks

`broadcast` is not wired in tests. Mock it.

`next/headers` and `next/navigation` are handled in `setup.ts` for the common case.

Do not point tests at the instance `data/` directory. Mock generators: `yarn mock:data:notes <username>` and `yarn mock:data:lists <username>` for local poking only. Do not commit generated notes.

## What to assert

Identity: pass uuids, expect uuids. A test that looks up by category+slug is documenting a leftover. Put new coverage on `getNoteById(uuid)`, `canReach(uuid, …)`, and the uuid routes.

Permission: owner vs collaborator vs stranger vs public. Read vs edit vs delete vs create.

Path containment: `..`, absolute paths, category tricks.

Leakage: public user objects, encrypted bodies staying closed, API responses not including secrets.

## Style

Match the neighbouring test file. No component snapshots of Tiptap or Tailwind class soup. Behaviour over rendering assertions.

If a test is slow, fix the test. Do not raise the timeout.
