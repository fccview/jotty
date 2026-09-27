# Environment variables

```bash
NODE_ENV=production
PUID=1000
PGID=1000
UMASK=002
HTTPS=true
SERVE_PUBLIC_IMAGES=yes
SERVE_PUBLIC_FILES=yes
STOP_CHECK_UPDATES=no
AUTH_MODE=oidc
OIDC_ISSUER=<YOUR_SSO_ISSUER>
OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>
APP_URL=https://your-jotty-domain.com
OIDC_CLIENT_SECRET=your_client_secret
SSO_FALLBACK_LOCAL=yes
OIDC_ADMIN_GROUPS=admins
```

### Mandatory (for production instances)

- `NODE_ENV=production` runs Node.js in production mode. Set it on every real instance.

### Optional

- `PUID=1000` Optional. The user ID the container runs as. Defaults to `1000`. On NAS systems like Unraid you'll want it to match the user that owns your mounted folders, or jotty can't write to them. `id -u` on Linux prints yours. If you use the `user:` directive in docker-compose.yml, that takes precedence and the container runs as that user.
- `PGID=1000` Optional. The group ID the container runs as. Defaults to `1000`. Match it to the group that owns your mounted folders. `id -g` on Linux prints yours. If you use the `user:` directive in docker-compose.yml, that takes precedence and the container runs as that group.
- `UMASK=002` Optional. The file creation mask. Defaults to `002`. It sets the default permissions on new files and folders. The usual values are `002` (group can write) or `022` (only the owner can write).
- `HTTPS=true` Optional. Turns on HTTPS mode, which marks session cookies as secure.
- `APP_URL=https://your-jotty-domain.com` Forces the base URL of your jotty·page instance. Required for SSO, optional otherwise. If logging in breaks behind a reverse proxy, try setting it, since jotty then logs you in against this exact URL.
- `INTERNAL_API_URL=http://localhost:3000` Optional. The URL jotty uses for API calls to itself inside the container. Defaults to `http://localhost:3000`. You only need it if session validation fails behind a reverse proxy.
- `SERVE_PUBLIC_IMAGES=yes` Optional. Lets anyone open uploaded images by their direct URL, without logging in.
- `SERVE_PUBLIC_FILES=yes` Optional. Same, for uploaded files.
- `SERVE_PUBLIC_VIDEOS=yes` Optional. Same, for uploaded videos.
- `STOP_CHECK_UPDATES=yes` Optional. Stops jotty calling the GitHub API to check for updates, so you won't get the "new version available" toast.
- `DEFAULT_LOCALE=en` Optional. The language jotty uses when nobody is logged in (the login page, for example) or when a user hasn't picked one. Defaults to `en`.
- `DISABLE_BRUTEFORCE_PROTECTION=yes` Optional. Turns off brute force protection for local login. By default an account locks for a while after 3 failed login attempts, with growing delays (10s, 30s, 60s, etc.). Set it to `yes` to switch that off entirely.
- `ENABLE_PWA_ZOOM=yes` Optional. Lets you zoom in the PWA, for accessibility. Zoom is off by default.
- `JOTTY_BODY_SIZE_LIMIT=100mb` Optional. The biggest request body Server Actions accept (uploads, drawio attachments, avatars, etc.). Defaults to `100mb`. Accepts `b`, `kb`, `mb`, `gb` (e.g. `50mb`, `2gb`). The runtime patcher applies it when the container starts, see [Runtime Patches](./PATCHES.md).
- `JOTTY_FREEBSD=1` Optional, and FreeBSD only. Turns on the FreeBSD compatibility patch, which stubs `@swc/core` (nobody publishes a native or WASM binary for FreeBSD) and makes Next.js use webpack instead of Turbopack. It does nothing on Linux, macOS or Windows, so leave it unset there. The runtime patcher applies it when the container starts, see [Runtime Patches](./PATCHES.md).

## SSO (optional)

### Mandatory

- `APP_URL=https://your-jotty-domain.com` The URL your OIDC provider sends users back to after they log in.
- `AUTH_MODE=oidc` turns on OIDC (OpenID Connect) single sign-on. The old name, `SSO_MODE`, still works as a fallback.
- `OIDC_ISSUER=<YOUR_SSO_ISSUER>` The URL of your OIDC provider (e.g. Authentik, Auth0, Keycloak).
- `OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>` The client ID from your OIDC provider.

### Optional

- `OIDC_CLIENT_SECRET=your_client_secret` Optional. The client secret, if your provider uses a confidential client.
- `OIDC_CLIENT_ID_FILE=/run/secrets/oidc_client_id` Optional. A file that holds the OIDC client ID. If set, it wins over `OIDC_CLIENT_ID`. Use it with Docker Secrets.
- `OIDC_CLIENT_SECRET_FILE=/run/secrets/oidc_client_secret` Optional. A file that holds the OIDC client secret. If set, it wins over `OIDC_CLIENT_SECRET`. Use it with Docker Secrets.
- `SSO_FALLBACK_LOCAL=yes` Optional. Keeps local username and password login available next to SSO.
- `OIDC_ADMIN_GROUPS=admins` Optional. Comma-separated OIDC groups whose members become admins.
- `OIDC_ADMIN_ROLES=admin` Optional. Comma-separated OIDC roles that make a user an admin.
- `OIDC_USER_GROUPS=jotty_users,app_users` Optional. Comma-separated OIDC groups allowed to log in. If set, only members of these groups (and admins) get in.
- `OIDC_USER_ROLES=user,member` Optional. Comma-separated OIDC roles allowed to log in. If set, only users with one of these roles (and admins) get in.
- `OIDC_GROUPS_SCOPE=groups` Optional. The scope jotty requests to get a user's groups. Defaults to "groups". Set it to an empty string or "no" for providers that don't support a groups scope, like Entra ID.
- `OIDC_LOGOUT_URL=https://authprovider.local/realms/master/logout` Optional. A full URL to send users to when they log out, for a global logout at your provider.

### Debugger

- `DEBUGGER=<value>` Optional. Turns on extra logging. Right now there are two flags: `proxy` for OIDC, login and routing problems, and `crud` for timing create, read, update and delete operations. `*` turns on every flag at once.
