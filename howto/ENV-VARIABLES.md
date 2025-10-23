# Environment Variables

```bash
NODE_ENV=production
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

- `NODE_ENV=production` Sets the Node.js environment to production mode for optimal performance and security.
- `HTTPS=true` Optional. Enables HTTPS mode for secure connections.
- `APP_URL=https://your-jotty-domain.com` Base URL of your jotty·page instance. Required for secure session (https) and SSO.
- `SERVE_PUBLIC_IMAGES=yes` Optional. Allows public access to uploaded images via direct URLs.
- `SERVE_PUBLIC_FILES=yes` Optional. Allows public access to uploaded files via direct URLs.
- `STOP_CHECK_UPDATES=no` Optional. If set to yes stops the github api call and won't give you a toast when a new update is available.

### SSO Configuration (Optional)

- `SSO_MODE=oidc` Enables OIDC (OpenID Connect) single sign-on authentication.
- `OIDC_ISSUER=<YOUR_SSO_ISSUER>` URL of your OIDC provider (e.g., Authentik, Auth0, Keycloak).
- `OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>` Client ID from your OIDC provider configuration.
- `OIDC_CLIENT_SECRET=your_client_secret` Optional. Client secret for confidential OIDC client authentication.
- `SSO_FALLBACK_LOCAL=yes` Optional. Allows both SSO and local authentication methods.
- `OIDC_ADMIN_GROUPS=admins` Optional. Comma-separated list of OIDC groups that should have admin privileges.
