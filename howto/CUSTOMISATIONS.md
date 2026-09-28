# Customisations

Themes and custom emojis live in the admin panel under **Admin > Styling**. This page is for the one thing that doesn't, which is overriding the PWA manifest by hand.

## Custom manifest

The manifest controls how Jotty looks when someone installs it as an app: name, description, icons, colours, shortcuts.

1. Create a file called `site.webmanifest` in your `config/` directory.
2. Put your manifest in it:

```json
{
  "name": "My Custom App Name",
  "short_name": "Custom App",
  "description": "A custom description for my PWA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#007bff",
  "orientation": "any",
  "categories": ["productivity", "utilities"],
  "lang": "en-US",
  "dir": "ltr",
  "icons": [
    {
      "src": "/custom-icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/custom-icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "New Note",
      "short_name": "New Note",
      "description": "Create a new note",
      "url": "/notes/new",
      "icons": [{ "src": "/shortcut-icon.png", "sizes": "96x96" }]
    }
  ],
  "version": "1.0.0"
}
```

3. Save the file and refresh your PWA. Jotty reads the file on every request, so there's nothing to restart.

If this file exists, Jotty serves it as is and ignores the app name, description and icons set in the admin settings. If the file isn't valid JSON, Jotty ignores it and serves its own manifest instead.

More on how the PWA works in [PWA.md](PWA.md).

## Config folder permissions

Jotty checks `themes.json` and `emojis.json` in `config/` when it loads them. If one is malformed, it logs a warning in the server console and carries on with the built-in themes and emojis.

> [!WARNING]
> The admin panel saves custom themes and emojis into `config/`, so Jotty needs to be able to write there. A read-only mount breaks saving them.

Set the folder up like this:

```bash
mkdir -p config
chown -R 1000:1000 config/
chmod -R 755 config/
```
