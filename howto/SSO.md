# SSO with OIDC

`jotty·page` supports any OIDC provider (Authentik, Auth0, Keycloak, Okta, etc.) with these requirements:

- Supports PKCE (most modern providers do)
- Can be configured as a public client (no client secret needed)
- Provides standard OIDC scopes (openid, profile, email)

1. Configure your OIDC Provider:

- Client Type: Public
- Grant Type: Authorization Code with PKCE
- PKCE Code Challenge Method: S256
  - _**note** S256 is the only PKCE method Jotty supports_
- Scopes: openid, profile, email
- Redirect URI: https://YOUR_APP_HOST/api/oidc/callback
- Post-logout URI: https://YOUR_APP_HOST/

2. Get these values from your provider:

- Client ID
- OIDC Issuer URL (usually ends with .well-known/openid-configuration)

3. Set environment variables:

```yaml
services:
  jotty:
    environment:
      - SSO_MODE=oidc
      - OIDC_ISSUER=https://YOUR_SSO_HOST/issuer/path
      - OIDC_CLIENT_ID=your_client_id
      - APP_URL=https://your-jotty-domain.com # if not set defaults to http://localhost:<port>
      # Optional security enhancements:
      - OIDC_CLIENT_SECRET=your_client_secret # Enable confidential client mode (if your provider requires it)
      - SSO_FALLBACK_LOCAL=yes # Allow both SSO and local login
      - OIDC_ADMIN_GROUPS=admins # Map IDP groups claim to admin role
      - OIDC_ADMIN_ROLES=admins # Map IDP roles claim to admin role
      - OIDC_USER_GROUPS=jotty_users,app_users # Restrict access to users in these groups (admins always allowed)
      - OIDC_USER_ROLES=user,member # Restrict access to users with these roles (admins always allowed)
      - OIDC_GROUPS_SCOPE=groups # Scope to request for groups (set to empty string or "no" to disable for providers like Entra ID)
      - OIDC_LOGOUT_URL=https://authprovider.local/realms/master/logout # Custom logout URL for global logout
      # Optional for reverse proxy issues:
      # - INTERNAL_API_URL=http://localhost:3000 # Use if getting 403 errors after SSO login
```

**Note**: When OIDC_CLIENT_SECRET is set, jotty·page switches to confidential client mode using client authentication instead of PKCE. This is more secure but requires provider support.

Dev verified Providers:

- Auth0 (`OIDC_ISSUER=https://YOUR_TENANT.REGION.auth0.com`)
- Authentik (`OIDC_ISSUER=https://YOUR_DOMAIN/application/o/APP_SLUG/`)

Other providers will likely work, but I can at least guarantee these do as I have test them both locally.  
Community verified Providers:

- [Pocket ID](https://github.com/fccview/jotty/issues/6#issuecomment-3350380435)(`OIDC_ISSUER: https://my-pocket-id.domain.com`)
- [Authelia](https://github.com/fccview/jotty/issues/6#issuecomment-3369291122) (`OIDC_ISSUER: https://my-authelia.domain.com`)
- [Google](https://github.com/fccview/jotty/issues/6#issuecomment-3437686494) (`OIDC_ISSUER: https://accounts.google.com`)
- [Entra ID (Azure AD)](https://github.com/fccview/jotty/issues/6#issuecomment-3464237999) (`OIDC_ISSUER: https://login.microsoftonline.com/{tenant-id}/v2.0`)

Provider's specific notes:

- **Google** provider doesn't support usage of `groups` with OIDC authentication, so do NOT set the `OIDC_ADMIN_GROUPS` environment variable.
- **Entra ID** provider allows usage of admin groups with `OIDC_ADMIN_GROUPS={Entra Group ID}` variable. For that, ensure to include optional `groups` claim in the 'Token Configuration' pane of your 'Enterprise Registration' AND define the environment variable to `OIDC_GROUPS_SCOPE="no"` or `OIDC_GROUPS_SCOPE=""`. Alternatively, use `OIDC_ADMIN_ROLES=role-name` to make use of Application Groups configured in Entra.

p.s. **First user to sign in via SSO when no local users exist becomes admin automatically.**

## Troubleshooting

### 403 Forbidden Error After SSO Login (Behind Reverse Proxy)

If you successfully authenticate via SSO but get redirected back to the login page, and your logs show:

```
MIDDLEWARE - sessionCheck: Response { ... status: 403 ... }
MIDDLEWARE - session is not ok
```

This means the app is trying to validate your session by calling its own API through the external URL, but your reverse proxy is blocking it.

**Solution**: Set the `INTERNAL_API_URL` environment variable:

```yaml
environment:
  - INTERNAL_API_URL=http://localhost:3000
```

This tells the app to use `localhost` for internal API calls instead of going through the reverse proxy. The default value is already `http://localhost:3000`, but explicitly setting it can help in some edge cases.

**Why this happens**: When `APP_URL` is set to your external domain (e.g., `https://jotty.domain.com`), the middleware tries to validate sessions by making a fetch request to `https://jotty.domain.com/api/auth/check-session`. This request goes through your reverse proxy, which may block it with a 403 Forbidden response due to security policies or misconfigurations.

## Advanced: Using Docker Secrets

<details>
<summary>Docker Secrets configuration</summary>

For enhanced security in production environments, you can store OIDC credentials in files instead of environment variables. This prevents secrets from appearing in `docker inspect` output.

**Example docker-compose.yml:**

```yaml
services:
  jotty:
    environment:
      - SSO_MODE=oidc
      - OIDC_ISSUER=https://YOUR_SSO_HOST/issuer/path
      - OIDC_CLIENT_ID_FILE=/run/secrets/oidc_client_id
      - OIDC_CLIENT_SECRET_FILE=/run/secrets/oidc_client_secret
      - APP_URL=https://your-jotty-domain.com
    secrets:
      - oidc_client_id
      - oidc_client_secret

secrets:
  oidc_client_id:
    file: ./secrets/oidc_client_id.txt
  oidc_client_secret:
    file: ./secrets/oidc_client_secret.txt
```

**Create the secret files:**

```bash
mkdir secrets
echo "your_client_id" > secrets/oidc_client_id.txt
echo "your_client_secret" > secrets/oidc_client_secret.txt
chmod 600 secrets/*
```

**Note:** You can mix and match - use `OIDC_CLIENT_ID` directly and `OIDC_CLIENT_SECRET_FILE` for the secret, or vice versa. The `_FILE` variants take priority if both are set. Most users can skip this and use regular environment variables.

</details>
