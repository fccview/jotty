# Auth

Three login paths, picked by env: local username plus password, LDAP (`ldapts`), OIDC. MFA is optional on top. API keys are a separate door for `app/api`.

## Session

`getCurrentUser()` in `app/_server/actions/users` returns a `SanitisedUser` or null. That is the only way to know who is asking.

The full record stays on the server (`findUserRecord`, `getCurrentUserRecord` in `users/records.ts`). Client components get the trimmed object. If a server helper shows up in a client bundle, fix the import chain. Do not hide it behind a dynamic import.

Users live in `data/users/users.json`. Every read-modify-write goes through the locked mutator in `records.ts`.

Sessions are a cookie holding a session id, mapped in `sessions.json` plus `session-data.json` via `app/_server/actions/session`. That is not a JWT. `jose` verifies OIDC tokens at the callback. `jsonwebtoken` is still in the lockfile. Do not start issuing app JWTs.

`isAuthenticated()`, `isAdmin()`, `canAccessAllContent()` wrap the common gates. Superadmin is the first account and can do slightly more. `canAccessAllContent` is settings-gated even for admins.

## What never comes from the client

Username, `isAdmin`, owner, category-as-identity. The session is the actor. `claimedName` refuses a FormData user blob that does not match. It does not choose one.

Do not log passwords, session ids, API keys, or MFA secrets.

## LDAP and OIDC

Env and operator docs: `howto/LDAP.md`, `howto/SSO.md`. Routes under `app/api/oidc/`. Bind and search live in `actions/auth/ldap.ts`. Auto-provision on first success. Do not invent a second user store for SSO accounts.

OIDC redirect URI has to match the IdP exactly, scheme included.

## MFA

`app/_server/actions/mfa`. TOTP via `speakeasy`. Secrets stay on the server. Schema in `_schemas/mfa-schemas.ts`. Operator docs: `howto/MFA.md`.

## API keys

`authenticateApiKey` in `actions/api`. Header `x-api-key`. Keys are hashed at rest. Generating a new one is an audit event. See [api.md](api.md).

## Sanitising

`sanitizeUserForClient` / `toPublicUser` in `user-sanitize-utils.ts`. Public owner lookup by item uuid (`getUserByNoteUuid`) returns public fields only. The security tests in `tests/security/data-leakage.test.ts` will fail you if you leak.
