# Unraid Deployment Guide

jotty·page can be installed on Unraid through the Community Applications store.
You can find the template **[here](https://github.com/fccview/unraid-templates/raw/main/templates/jotty.xml)**

## Installation

### Via Community Applications (Coming soon)

1. Go to the **Apps** tab in Unraid
2. Search for "jotty"
3. Click **Install** on the jotty·page template
4. Configure settings (see below)
5. Click **Apply**

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

See [ENV-VARIABLES.md](ENV-VARIABLES.md) for full list.

## Image Tags

- **`latest`**: Stable release (recommended)
- **`develop`**: Development branch (beta pre-release)
