# Docker Compose configuration

What each value in the jotty·page `docker-compose.yml` does.

## Basic docker-compose.yml

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
      - ./config:/app/config:rw
      - ./cache:/app/.next/cache:rw
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    # platform: linux/arm64
```

> [!NOTE]
> Running with Podman or rootless Docker? There's an extra option for you further down.

## Container

```yaml
image: ghcr.io/fccview/jotty:latest
```

The image to pull from GitHub Container Registry. `latest` is the current stable release. You can also use `main`, `develop` _(beta features, when there are any)_ or a specific version tag for amd or arm.

```yaml
container_name: jotty
```

A fixed name for the container, so `docker logs jotty` and friends work without looking up an ID.

```yaml
user: "1000:1000"
```

The user and group ID the container runs as. Match it to the user on your host that owns the mounted folders, or you'll get permission errors. You can use the `PUID` and `PGID` environment variables instead, which tends to be easier on NAS systems like Unraid. If you set neither, it runs as `1000:1000`. If you set both, `user:` wins.

```yaml
userns_mode: keep-id
```

Required for Podman and rootless Docker. It keeps the user namespace when mounting volumes, so the container user (1000:1000) can read and write the mounted directories.

You need it if:

- you run Podman instead of Docker
- you run Docker in rootless mode
- you get permission denied errors writing to mounted volumes, e.g. `EACCES: permission denied, open '/app/data/users/session-data.json'`

In a rootless setup the container user can't become root to reach the mounted volumes. `userns_mode: keep-id` maps the container user's UID/GID straight to the host's UID/GID, which fixes that. The [Podman rootless tutorial](https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md#using-volumes) has the details.

## Ports

```yaml
ports:
  - "1122:3000"
```

Maps port 1122 on the host to port 3000 in the container. Change `1122` to any free port on your host. Leave `3000` alone.

## Volumes

```yaml
volumes:
  - ./data:/app/data:rw
  - ./config:/app/config:rw
  - ./cache:/app/.next/cache:rw
```

Host folders mounted into the container, so your data survives the container being replaced.

- `- ./data:/app/data:rw` is your local `data` folder, mounted read-write at `/app/data`. Your checklists, notes, users and settings live here. Back it up.
- `- ./config:/app/config:rw` is your local `config` folder, mounted read-write at `/app/config`. Custom themes and config files go here, and the admin panel saves to it.
- `- ./cache:/app/.next/cache:rw` is optional. It keeps the Next.js build cache between container restarts, so the app is faster after a restart.

## Restart policy

```yaml
restart: unless-stopped
```

Docker restarts the container after a crash or a reboot, unless you stopped it yourself.

## Environment variables

```yaml
environment:
  - NODE_ENV=production
  - PUID=1000
  - PGID=1000
  - UMASK=002
  - HTTPS=true
  - SERVE_PUBLIC_IMAGES=yes
  - SERVE_PUBLIC_FILES=yes
  - STOP_CHECK_UPDATES=no
  - AUTH_MODE=oidc
  - OIDC_ISSUER=<YOUR_SSO_ISSUER>
  - OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>
  - APP_URL=https://your-jotty-domain.com
  - OIDC_CLIENT_SECRET=your_client_secret
  - SSO_FALLBACK_LOCAL=yes
  - OIDC_ADMIN_GROUPS=admins
```

- `- NODE_ENV=production` runs Node.js in production mode. Always set this on a real instance.
- `- PUID=1000` Optional. The user ID the container runs as. Defaults to `1000`. Set it to your host user's ID, which `id -u` prints on Linux. Handy on NAS systems like Unraid. The `user:` directive in docker-compose takes precedence over PUID/PGID.
- `- PGID=1000` Optional. The group ID the container runs as. Defaults to `1000`. Set it to your host group's ID, which `id -g` prints on Linux. The `user:` directive in docker-compose takes precedence over PUID/PGID.
- `- UMASK=002` Optional. The file creation mask, which sets the default permissions on new files and folders. Defaults to `002`.
- `- HTTPS=true` Optional. Turns on HTTPS mode, which marks session cookies as secure.
- `- APP_URL=https://your-jotty-domain.com` The base URL of your jotty·page instance. Required for secure (https) sessions and for SSO.
- `- SERVE_PUBLIC_IMAGES=yes` Optional. Lets anyone open uploaded images by their direct URL, without logging in.
- `- SERVE_PUBLIC_FILES=yes` Optional. Same as above, for uploaded files.
- `- STOP_CHECK_UPDATES=no` Optional. Set it to yes and jotty stops calling the GitHub API to check for updates, so you won't get the "new version available" toast.
- `- DISABLE_BRUTEFORCE_PROTECTION=true` Optional. Turns off brute force protection for local login. By default an account locks for a while after 3 failed login attempts, with growing delays (10s, 30s, 60s, etc.). Set it to `true` to switch that off entirely.

### SSO (optional)

- `- AUTH_MODE=oidc` turns on OIDC (OpenID Connect) single sign-on. The old name, `SSO_MODE`, still works as a fallback.
- `- OIDC_ISSUER=<YOUR_SSO_ISSUER>` The URL of your OIDC provider (e.g. Authentik, Auth0, Keycloak).
- `- OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>` The client ID from your OIDC provider.
- `- OIDC_CLIENT_SECRET=your_client_secret` Optional. The client secret, if your provider uses a confidential client.
- `- OIDC_CLIENT_ID_FILE=/run/secrets/oidc_client_id` Optional. A file that holds the OIDC client ID. If set, it wins over `OIDC_CLIENT_ID`. Use it with Docker Secrets.
- `- OIDC_CLIENT_SECRET_FILE=/run/secrets/oidc_client_secret` Optional. A file that holds the OIDC client secret. If set, it wins over `OIDC_CLIENT_SECRET`. Use it with Docker Secrets.
- `- SSO_FALLBACK_LOCAL=yes` Optional. Keeps local username and password login available next to SSO.
- `- OIDC_ADMIN_GROUPS=admins` Optional. Comma-separated OIDC groups whose members become admins.
- `- OIDC_ADMIN_ROLES=admin` Optional. Comma-separated OIDC roles that make a user an admin.
- `- OIDC_USER_GROUPS=jotty_users,app_users` Optional. Comma-separated OIDC groups allowed to log in. If set, only members of these groups (and admins) get in.
- `- OIDC_USER_ROLES=user,member` Optional. Comma-separated OIDC roles allowed to log in. If set, only users with one of these roles (and admins) get in.

## API docs service

jotty can run a separate ReDoc container that serves interactive docs for every API endpoint. It's optional.

### Setup

1. Add `ENABLE_API_DOCS=true` to the jotty environment variables.
2. Run `docker-compose --profile api-docs up -d`.
3. Open `http://localhost:8080`, or whatever you set `API_DOCS_PORT` to.

### Health checks

I try to keep the image small, so it doesn't ship curl or wget just for health checks. Node is already there, so the health check uses it to call the health endpoint.

```yaml
healthcheck:
    test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
    interval: 30s
    timeout: 10s
    start_period: 40s
    retries: 3
```

### Service

```yaml
api-docs:
  image: redocly/redoc:latest
  container_name: jotty-api-docs
  ports:
    - "${API_DOCS_PORT:-8080}:80"
  environment:
    SPEC_URL: http://your-jotty-url.com/api/docs
  depends_on:
    - jotty
  profiles:
    - api-docs
```

## Platform

```yaml
platform: linux/arm64
```

Optional. The target platform. Uncomment it on ARM64 machines, like Apple Silicon Macs or a Raspberry Pi.

## Podman rootless via Quadlet

If you run jotty with [podman-quadlet](https://docs.podman.io/en/latest/markdown/podman-quadlet.1.html), set these from above:

- PUID and PGID
- userns_mode

A complete Container unit looks like this:

```
[Container]
AutoUpdate=registry
Image=ghcr.io/fccview/jotty:latest
PublishPort=3000:3000
Volume=/srv/jotty/data:/app/data:rw
Volume=/srv/jotty/config:/app/config:rw
Volume=/srv/jotty/cache:/app/cache:rw
Environment=NODE_ENV=production
Environment=PUID=1000
Environment=PGID=1000
Environment=APP_URL=https://EXTERNAL_URL
UserNS=keep-id
```
