# SSO with OIDC

`jotty·page` works with any OIDC provider (Authentik, Auth0, Keycloak, Okta, etc.) that:

- Supports PKCE (most current providers do)
- Can be set up as either a public client (no client secret) or a confidential client (with a client secret)
- Provides the standard OIDC scopes (openid, profile, email)

1. Configure your OIDC provider:

- Client Type: Public, or Confidential if you set `OIDC_CLIENT_SECRET`
  - _Some providers, like Authelia, refuse a client secret on a public client. Pick one or the other_
- Grant Type: Authorization Code with PKCE
- PKCE Code Challenge Method: S256
  - _S256 is the only PKCE method Jotty supports_
- Scopes: openid, profile, email
- Redirect URI: https://YOUR_APP_HOST/api/oidc/callback
  - _Jotty builds this from `APP_URL` as written, so leave the trailing `/` off `APP_URL` or you get `//api/oidc/callback`_
- Post-logout URI: https://YOUR_APP_HOST/

2. Get these values from your provider:

- Client ID
- OIDC Issuer URL (usually ends with .well-known/openid-configuration)

3. Set environment variables:

```yaml
services:
  jotty:
    environment:
      - AUTH_MODE=oidc
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

When `OIDC_CLIENT_SECRET` is set, jotty·page switches to confidential client mode and authenticates with the client secret instead of PKCE. It's more secure, but your provider has to support it.

Providers I've tested myself:

- Auth0 (`OIDC_ISSUER=https://YOUR_TENANT.REGION.auth0.com`)
- Authentik (`OIDC_ISSUER=https://YOUR_DOMAIN/application/o/APP_SLUG/`)

Other providers will probably work, but these two I've run locally and can vouch for.

Providers the community has confirmed:

- [Pocket ID](https://github.com/fccview/jotty/issues/6#issuecomment-3350380435)(`OIDC_ISSUER: https://my-pocket-id.domain.com`)
- [Authelia](https://github.com/fccview/jotty/issues/6#issuecomment-3369291122) (`OIDC_ISSUER: https://my-authelia.domain.com`)
- [Google](https://github.com/fccview/jotty/issues/6#issuecomment-3437686494) (`OIDC_ISSUER: https://accounts.google.com`)
- [Entra ID (Azure AD)](https://github.com/fccview/jotty/issues/6#issuecomment-3464237999) (`OIDC_ISSUER: https://login.microsoftonline.com/{tenant-id}/v2.0`)

Provider-specific notes:

- **Google** doesn't support `groups` with OIDC, so do NOT set `OIDC_ADMIN_GROUPS`.
- **Entra ID** supports admin groups with `OIDC_ADMIN_GROUPS={Entra Group ID}`. For that to work, add the optional `groups` claim in the 'Token Configuration' pane of your 'Enterprise Registration' AND set `OIDC_GROUPS_SCOPE="no"` or `OIDC_GROUPS_SCOPE=""`. Or use `OIDC_ADMIN_ROLES=role-name` to use Application Groups configured in Entra.

If there are no local users yet, **the first person to sign in through SSO becomes admin.**

## Troubleshooting

### 403 Forbidden error after SSO login (behind a reverse proxy)

You log in through SSO fine, land back on the login page, and your logs show:

```
MIDDLEWARE - sessionCheck: Response { ... status: 403 ... }
MIDDLEWARE - session is not ok
```

The app is checking your session by calling its own API through the external URL, and your reverse proxy is blocking that call.

Set `INTERNAL_API_URL`:

```yaml
environment:
  - INTERNAL_API_URL=http://localhost:3000
```

That makes the app call itself on `localhost` instead of going out through the reverse proxy. The default is already `http://localhost:3000`, but setting it explicitly fixes some odd setups.

Why it happens: with `APP_URL` set to your external domain (e.g. `https://jotty.domain.com`), the middleware checks sessions by fetching `https://jotty.domain.com/api/auth/check-session`. That request goes through your reverse proxy, and a security policy or a misconfiguration there can answer it with a 403.

### My superadmin (system owner) user is not using SSO

The first user to register on an instance is the superadmin, called "System Owner" in the web interface.

If that user isn't an SSO user, or you want to hand superadmin to someone else, use the `update-super-admin.sh` script below.

> [!WARNING]
> Run it on the server, **outside** the Docker container if you use Docker.
> You need write access to `users.json`. Running as `root` gives you that.

1. Find your `data` volume on the server and the `users.json` inside it. With the example `docker-compose.yml`, `volumes`
   has `./data:/app/data:rw`, so `data` sits next to your compose file and the full path is:
   `<compose_location>/data/users.json`

2. Run `update-super-admin.sh` with the new superadmin and the path to `users.json`:

   ```bash
   wget -qO- https://raw.githubusercontent.com/fccview/jotty/main/scripts/update-super-admin.sh | bash -s -- <new super admin> <users.json location>
   ```

   You can also download the script and run it directly.

   Leave the arguments off (`wget -qO- ... | bash`) to get the help text.

   The old superadmin stays on as an admin. The new superadmin can delete that user if you want.

## Advanced: using Docker secrets

<details>
<summary>Docker secrets configuration</summary>

You can keep OIDC credentials in files instead of environment variables, so they don't show up in `docker inspect` output.

Example `docker-compose.yml`:

```yaml
services:
  jotty:
    environment:
      - AUTH_MODE=oidc
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

Create the secret files:

```bash
mkdir secrets
echo "your_client_id" > secrets/oidc_client_id.txt
echo "your_client_secret" > secrets/oidc_client_secret.txt
chmod 600 secrets/*
```

You can mix the two, e.g. `OIDC_CLIENT_ID` as a plain variable and `OIDC_CLIENT_SECRET_FILE` for the secret, or the other way round. If both forms are set, the `_FILE` one wins. Most people can skip all of this and use plain environment variables.

</details>
