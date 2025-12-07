# Environment Variables

```bash
NODE_ENV=production
PUID=1000
PGID=1000
UMASK=002
HTTPS=true
SERVE_PUBLIC_IMAGES=yes
SERVE_PUBLIC_FILES=yes
STOP_CHECK_UPDATES=no
SSO_MODE=oidc
OIDC_ISSUER=<YOUR_SSO_ISSUER>
OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>
APP_URL=https://your-jotty-domain.com
OIDC_CLIENT_SECRET=your_client_secret
SSO_FALLBACK_LOCAL=yes
OIDC_ADMIN_GROUPS=admins
```

### Mandatory (for production instances)

- `NODE_ENV=production` Sets the Node.js environment to production mode for optimal performance and security.

### Optional

- `PUID=1000` Optional. Process User ID that the container will run as. Defaults to `1000` if not set. This is particularly useful when running on NAS systems like Unraid, where you need to match the user ID of your host system for proper file permissions on mounted volumes. Set this to match your host system's user ID (you can find it with `id -u` on Linux). **Note:** If you use the `user:` directive in docker-compose.yml, that will take precedence and the container will run as that user directly.
- `PGID=1000` Optional. Process Group ID that the container will run as. Defaults to `1000` if not set. This should match your host system's group ID for proper file permissions on mounted volumes. You can find your group ID with `id -g` on Linux. **Note:** If you use the `user:` directive in docker-compose.yml, that will take precedence and the container will run as that group directly.
- `UMASK=002` Optional. Sets the default file creation mask. Defaults to `002` if not set. This controls the default permissions for newly created files and directories. Common values are `002` (group writable) or `022` (owner writable only).
- `HTTPS=true` Optional. Enables HTTPS mode for secure connections.
- `APP_URL=https://your-jotty-domain.com` Force a base URL of your jotty·page instance. Required for SSO but optional otherwise - if you have trouble logging in with reverse proxy try setting this up as it will force the application to login using this exact url.
- `INTERNAL_API_URL=http://localhost:3000` Optional. URL used for internal API calls within the container. Defaults to `http://localhost:3000` if not set. Only needed if you're experiencing session validation issues behind a reverse proxy.
- `SERVE_PUBLIC_IMAGES=yes` Optional. Allows public access to uploaded images via direct URLs.
- `SERVE_PUBLIC_FILES=yes` Optional. Allows public access to uploaded files via direct URLs.
- `SERVE_PUBLIC_VIDEOS=yes` Optional. Allows public access to uploaded files via direct URLs.
- `STOP_CHECK_UPDATES=yes` Optional. If set to yes stops the github api call and won't give you a toast when a new update is available.

## SSO Configuration (Optional)

### Mandatory

- `APP_URL=https://your-jotty-domain.com` Tells the OIDC of your choice what url you are trying to authenticate against.
- `SSO_MODE=oidc` Enables OIDC (OpenID Connect) single sign-on authentication.
- `OIDC_ISSUER=<YOUR_SSO_ISSUER>` URL of your OIDC provider (e.g., Authentik, Auth0, Keycloak).
- `OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>` Client ID from your OIDC provider configuration.

### Optional

- `OIDC_CLIENT_SECRET=your_client_secret` Optional. Client secret for confidential OIDC client authentication.
- `SSO_FALLBACK_LOCAL=yes` Optional. Allows both SSO and local authentication methods.
- `OIDC_ADMIN_GROUPS=admins` Optional. Comma-separated list of OIDC groups that should have admin privileges.
- `OIDC_GROUPS_SCOPE=groups` Optional. Scope to request for groups. Defaults to "groups". Set to empty string or "no" to disable for providers like Entra ID that don't support the groups scope.
- `OIDC_LOGOUT_URL=https://authprovider.local/realms/master/logout` Optional. Custom logout URL for global logout. Full URL to redirect to when logging out.
