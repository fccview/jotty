# Unraid Deployment Guide

jotty·page can be installed on Unraid through the Community Applications store.

## Installation

### Via Community Applications (Coming soon)

1. Go to the **Apps** tab in Unraid
2. Search for "jotty"
3. Click **Install** on the jotty·page template
4. Configure settings (see below)
5. Click **Apply**

### Manual Template Installation

If not yet available in Community Applications:

1. Go to **Docker** tab → **Add Container**
2. Click **Template repositories**
3. Add: `https://raw.githubusercontent.com/fccview/jotty/master/unraid-template.xml`
4. Click **Save**

## Configuration

### Port Settings
- **Host Port**: `1122` (default, change to any available port)
- **Container Port**: `3000` (do not change)

Access at: `http://[UNRAID-IP]:1122`

### Storage Paths

Default location: `/mnt/user/appdata/jotty/`

- **`/data`**: Checklists, notes, users, encryption keys (**back this up!**)
- **`/config`**: Custom themes and configuration
- **`/cache`**: Next.js cache (optional, can be removed to save space)

### User/Group

- **PUID**: `99` (Unraid nobody user)
- **PGID**: `100` (Unraid users group)
- **Extra Parameters**: `--user 99:100`

To use different user/group, remove `--user 99:100` from Extra Parameters and update PUID/PGID.

### Environment Variables

See [ENV-VARIABLES.md](ENV-VARIABLES.md) for full list. Common options:

- **`NODE_ENV`**: `production` (required)
- **`APP_URL`**: Your full URL (required for HTTPS/SSO)
- **`HTTPS`**: `true` (if using SSL)
- **`SSO_MODE`**: `oidc` (for SSO, see [SSO.md](SSO.md))
- **`SERVE_PUBLIC_IMAGES`**: `yes` (default)
- **`SERVE_PUBLIC_FILES`**: `yes` (default)

## First-Time Setup

1. Access `http://[UNRAID-IP]:1122`
2. Create admin account at `/auth/setup` (or sign in via SSO if enabled)

## Updating

### Via Web UI
1. **Docker** tab → Click jotty icon
2. **Check for Updates** → **Update**

### Via CLI
```bash
docker stop jotty
docker pull ghcr.io/fccview/jotty:latest
docker start jotty
```

## Image Tags

- **`latest`**: Stable release (recommended)
- **`develop`**: Development branch (testing)
- **`1.x.x`**: Specific version

## Troubleshooting

### Permission Errors
```bash
chown -R 99:100 /mnt/user/appdata/jotty/
```

### 403 Errors After SSO Login
Add environment variable:
```
INTERNAL_API_URL=http://localhost:3000
```

### Container Won't Start
1. Check logs: **Docker** tab → Click icon → **Logs**
2. Verify paths exist
3. Check port not in use

## Backup

**Always backup before updates!**

### Manual
```bash
tar -czf jotty-backup-$(date +%Y%m%d).tar.gz /mnt/user/appdata/jotty/data/
```

### Automated
Use Unraid plugins:
- **CA Backup / Restore Appdata** (recommended)
- **Duplicati**
- **Restic**

---

**Template made by [sean](http://discordapp.com/users/66198431953059840) from our discord community**
