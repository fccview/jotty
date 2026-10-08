# Self-hosting

Running jotty·page yourself: what each value in `docker-compose.yml` does, running more than one instance, Unraid and runtime patches.

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

## MCP server

`docker-compose.mcp.yml` in the repo root runs jotty and the [MCP server](../mcp-server/README.md) on one network, so assistants such as Claude or Cursor can work with your notes and lists:

```bash
docker compose -f docker-compose.mcp.yml up -d
```

## API docs service

jotty can run a separate ReDoc container that serves interactive docs for every API endpoint. It's optional: the same docs, with a way to send requests, are already inside jotty under **How to > API**. ReDoc is for reading them outside the app.

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

## Running more than one instance

jotty·page can run as several instances against one shared `data/` directory, so live editing keeps working when one of them goes down. Nothing extra is installed: no database, no message broker. The instances talk to each other through small throwaway files in `data/.replica/`. Each file holds the live text of one open note and who has it open. jotty deletes the file once everybody closes the note, so your notes in `data/` stay the only lasting copy.

### Setup

1. Mount the same `data/` directory into every instance. A local disk or network storage like NFS both work.
2. Give every instance its own `JOTTY_NODE` name, for example `node1` and `node2`. Letters, numbers, `-` and `_` only. That alone turns clustering on. Each instance also gets its own search index, `data/.relations_<name>.db`, rebuilt from your notes at startup, because two instances writing one index corrupts it. `JOTTY_RELATIONS_DB` overrides that name, so either leave it unset or give every instance its own path.
3. Put the instances behind one address. Your proxy has to forward WebSocket upgrades and leave the `Host` header alone, because live editing refuses a connection whose `Host` doesn't match the page's address. When that happens the page still loads and typing still saves, but there are no avatars.

### What people see when an instance goes down

- The editor shows **Offline** and keeps accepting typing.
- The browser reconnects by itself, and the proxy sends it to a surviving instance.
- Typing done while offline is merged back in. If somebody saved the note in the meantime and nobody had it open, jotty offers the offline text back with **Copy my changes** instead of overwriting.

Nobody has to do anything. Always use the same address, because the unsaved draft is kept per address.

### Limits

- Keep the servers' clocks in sync, for example with NTP, like any multi-server setup.
- Only live note editing crosses instances. Tick a checklist item or rename a note and devices on the same instance see it straight away. Devices on another instance see it after a reload.
- Each instance spots the others' changes by watching `data/`. That works when the instances share a disk on one machine. Network storage like NFS, SMB or EFS often doesn't report changes from another machine, so search, backlinks and the brain on that instance fall behind. Restart it and it rebuilds its index.

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

## Unraid

You can install jotty·page on Unraid from a template. It's on its way to the Community Applications store, and until then you can grab it **[here](https://github.com/fccview/unraid-templates/raw/main/templates/jotty.xml)**.

### Installation

#### From Community Applications (coming soon)

1. Open the **Apps** tab in Unraid.
2. Search for "jotty".
3. Click **Install** on the jotty·page template.
4. Fill in the settings below.
5. Click **Apply**.

### Configuration

#### Ports

- Host port `1122` is the default. Change it to any free port.
- Container port `3000` stays as it is.

Then open `http://[UNRAID-IP]:1122`.

#### Storage paths

The default location is `/mnt/user/appdata/jotty/`.

- `/data` holds checklists, notes, users and encryption keys.
- `/config` holds custom themes and configuration.
- `/cache` is the Next.js cache. It's optional, and you can remove it to save space.

> [!IMPORTANT]
> Back up `/data`. Everything your users wrote lives there, and nothing else can bring it back.

#### User and group

- PUID `99` is Unraid's nobody user.
- PGID `100` is Unraid's users group.
- Extra Parameters is set to `--user 99:100`.

To run as a different user or group, remove `--user 99:100` from Extra Parameters and change PUID and PGID.

#### Environment variables

The full list is in [ENV-VARIABLES.md](ENV-VARIABLES.md).

### Image tags

- `latest` is the stable release. Use this one.
- `develop` is the development branch, a beta pre-release.

## Runtime patches

Some upstream bugs can only be fixed by rewriting a file inside `node_modules` after install. Next.js standalone builds ignoring `serverActions.bodySizeLimit` is one of them. jotty·page has a small patch runner for this. It runs every time the container starts, before the server boots.

### Where patches live

- `patches/` holds the patches that ship with the image. Each one is a small JS module that exports `{ name, apply(ctx) }`. They run in alphabetical order.
- `user_patches/` is optional and mounted from your host. Any `.js` file you put here runs **after** the built-in patches, so you can add your own tweaks without rebuilding the image.

### Adding your own patches

1. Create a `user_patches/` folder next to your `docker-compose.yml`.
2. Put a `.js` file in it, e.g. `user_patches/my-tweak.js`:

   ```js
   const fs = require("fs");
   const path = require("path");

   module.exports = {
     name: "my-tweak",
     apply: (ctx) => {
       /* ctx.projectRoot points at /app inside the container
          do whatever you need; return a short status string */
       return "applied";
     },
   };
   ```

3. Mount it in `docker-compose.yml`:

   ```yaml
   volumes:
     - ./user_patches:/app/user_patches:ro
   ```

4. Restart the container. Each patch logs its result to stdout on every start.

Patches run on every restart, so write them to be **idempotent**. Check whether the file already has the value you want (an anchored regex or a lookahead does the job) before you write, and running the same patch twice changes nothing the second time.

### Built-in patches

<details>
<summary><code>body-size-limit_20260427.js</code>, raises the 1MB Server Actions body cap</summary>

In standalone builds Next.js 16 ignores `serverActions.bodySizeLimit` from `next.config` and keeps the hard-coded 1MB cap in `app-page*.runtime.prod.js`. This patch rewrites that cap, so server actions (file uploads, drawio attachments, avatar uploads, etc.) accept bigger payloads.

- Set it with the `JOTTY_BODY_SIZE_LIMIT` env var.
- Defaults to `100mb`.
- Accepts `b`, `kb`, `mb`, `gb` (e.g. `50mb`, `2gb`).
- Tracking issue: [#422](https://github.com/fccview/jotty/issues/422)

```yaml
environment:
  - JOTTY_BODY_SIZE_LIMIT=250mb
```

</details>

<details>
<summary><code>freebsd_20260427.js</code>, FreeBSD compatibility (stubs <code>@swc/core</code>, forces webpack)</summary>

`@swc/core` has no prebuilt native binary for FreeBSD and no published WASM fallback, so anything that imports it (next-intl, @serwist/turbopack) crashes on require. Turbopack doesn't work there for the same reason. The patch does two things:

1. Stubs `node_modules/@swc/core/binding.js`, both the hoisted and the nested copies, so the imports succeed. The stub methods only throw if something calls them, and nothing in jotty does.
2. Patches `parseBundlerArgs()` in `next/dist/lib/bundler.js` to force the webpack bundler, so Next never tries to load Turbopack.

- It only runs when `JOTTY_FREEBSD` is set. Without it the patch doesn't read or touch anything under `node_modules`.
- It's off by default. On Linux, macOS or Windows, leave it unset.

```yaml
environment:
  - JOTTY_FREEBSD=1
```

</details>
