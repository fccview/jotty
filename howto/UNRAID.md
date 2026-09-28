# Unraid

You can install jotty·page on Unraid from a template. It's on its way to the Community Applications store, and until then you can grab it **[here](https://github.com/fccview/unraid-templates/raw/main/templates/jotty.xml)**.

## Installation

### From Community Applications (coming soon)

1. Open the **Apps** tab in Unraid.
2. Search for "jotty".
3. Click **Install** on the jotty·page template.
4. Fill in the settings below.
5. Click **Apply**.

## Configuration

### Ports

- Host port `1122` is the default. Change it to any free port.
- Container port `3000` stays as it is.

Then open `http://[UNRAID-IP]:1122`.

### Storage paths

The default location is `/mnt/user/appdata/jotty/`.

- `/data` holds checklists, notes, users and encryption keys.
- `/config` holds custom themes and configuration.
- `/cache` is the Next.js cache. It's optional, and you can remove it to save space.

> [!IMPORTANT]
> Back up `/data`. Everything your users wrote lives there, and nothing else can bring it back.

### User and group

- PUID `99` is Unraid's nobody user.
- PGID `100` is Unraid's users group.
- Extra Parameters is set to `--user 99:100`.

To run as a different user or group, remove `--user 99:100` from Extra Parameters and change PUID and PGID.

### Environment variables

The full list is in [ENV-VARIABLES.md](ENV-VARIABLES.md).

## Image tags

- `latest` is the stable release. Use this one.
- `develop` is the development branch, a beta pre-release.
