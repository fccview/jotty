# Docker Compose Configuration Guide

This guide explains every configuration value in the `docker-compose.yml` file for jotty·page.

## Complete Docker Compose Example

```yaml
services:
  jotty:
    image: ghcr.io/fccview/jotty:latest
    container_name: jotty
    user: "1000:1000"
    ports:
      - "1122:3000"
    volumes:
      - ./data:/app/data:rw
      - ./config:/app/config:ro
      - ./cache:/app/.next/cache:rw
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    # platform: linux/arm64
```

## Container Configuration

```yaml
image: ghcr.io/fccview/jotty:latest
```

Specifies the Docker image to use. This pulls the latest stable version of jotty·page from GitHub Container Registry. You can use `latest`, `main`, `develop` _(for beta features when available)_ and the specific tag numbers for amd/arm specifically.

```yaml
container_name: jotty
```

Sets a custom name for the running container. This makes it easier to manage with docker commands.

```yml
user: "1000:1000"
```

Runs the container with the specified user and group ID. This should match your host system user for proper file permissions.

## Network Configuration

```yaml
ports:
  - "1122:3000"
```

Maps host port 1122 to container port 3000. You can change `1122` to any available port on your host system.

## Storage Configuration

```yaml
volumes:
  - ./data:/app/data:rw
  - ./config:/app/config:ro
  - ./cache:/app/.next/cache:rw
```

Mounts host directories into the container for persistent data storage. Here's some detials:

- `- ./data:/app/data:rw` Mounts your local `data` directory to `/app/data` inside the container with read-write permissions. This stores your checklists, notes, users, and settings.
- `- ./config:/app/config:ro` Mounts your local `config` directory to `/app/config` as read-only. This contains custom themes and configuration files.
- `- ./cache:/app/.next/cache:rw` Optional mount for Next.js build cache. Improves performance by persisting cache between container restarts.

## Runtime Configuration

```yaml
restart: unless-stopped
```

Automatically restarts the container unless it was explicitly stopped. Ensures your app stays running.

## Environment Variables

```yaml
environment:
  - NODE_ENV=production
  - HTTPS=true
  - SERVE_PUBLIC_IMAGES=yes
  - SERVE_PUBLIC_FILES=yes
  - SSO_MODE=oidc
  - OIDC_ISSUER=<YOUR_SSO_ISSUER>
  - OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>
  - APP_URL=https://your-jotty-domain.com
  - OIDC_CLIENT_SECRET=your_client_secret
  - SSO_FALLBACK_LOCAL=true
  - OIDC_ADMIN_GROUPS=admins
```

- `- NODE_ENV=production` Sets the Node.js environment to production mode for optimal performance and security.
- `- HTTPS=true` Optional. Enables HTTPS mode for secure connections.
- `- APP_URL=https://your-jotty-domain.com` Base URL of your jotty·page instance. Required for secure session (https) and SSO.
- `- SERVE_PUBLIC_IMAGES=yes` Optional. Allows public access to uploaded images via direct URLs.
- `- SERVE_PUBLIC_FILES=yes` Optional. Allows public access to uploaded files via direct URLs.

### SSO Configuration (Optional)

- `- SSO_MODE=oidc` Enables OIDC (OpenID Connect) single sign-on authentication.
- `- OIDC_ISSUER=<YOUR_SSO_ISSUER>` URL of your OIDC provider (e.g., Authentik, Auth0, Keycloak).
- `- OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>` Client ID from your OIDC provider configuration.
- `- OIDC_CLIENT_SECRET=your_client_secret` Optional. Client secret for confidential OIDC client authentication.
- `- SSO_FALLBACK_LOCAL=true` Optional. Allows both SSO and local authentication methods.
- `- OIDC_ADMIN_GROUPS=admins` Optional. Comma-separated list of OIDC groups that should have admin privileges.

## Platform Configuration

```yaml
platform: linux/arm64
```

Optional. Specifies the target platform. Uncomment this line if running on ARM64 systems (like Apple Silicon Macs or Raspberry Pi).
