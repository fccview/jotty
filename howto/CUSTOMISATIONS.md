# Customisations

Themes and custom emojis live in the admin panel under **Admin > Styling**. This page covers what doesn't: installing jotty·page as an app, overriding its manifest by hand, and the `config/` folder.

## Installing the PWA

jotty·page is a Progressive Web App (PWA). Install it and it opens in its own window with its own icon, like any other app on your device.

### Install prompt

Open jotty·page over https in a browser that supports PWAs and you'll get an install prompt, as a banner or a button.

### Installing by hand

No prompt? You can install it yourself.

#### On mobile (iOS Safari/Chrome)

1. Open jotty·page in your browser.
2. Tap the **Share** button (iOS) or the **Menu** button (Android).
3. Pick **"Add to Home Screen"** (iOS) or **"Add to Home screen"** (Android).
4. Confirm.

#### On desktop (Chrome/Edge)

1. Click the **Install** button in the address bar, the one that looks like a computer with a down arrow.
2. Or open **Menu** (⋮) > **More tools** > **Create shortcut**.
3. Tick **"Open as window"** and click **Create**.

#### On desktop (Firefox)

1. Open **Menu** (☰) > **More tools** > **Add to desktop**.
2. Confirm.

## Custom manifest

The manifest controls how jotty·page looks when someone installs it as an app: name, description, icons, colours, shortcuts.

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

3. Save the file and refresh your PWA. jotty·page reads the file on every request, so there's nothing to restart.

If this file exists, jotty·page serves it as is and ignores the app name, description and icons set in the admin settings. If the file isn't valid JSON, jotty·page ignores it and serves its own manifest instead.

## Things to know before you customise

### The splash screen keeps its install-time colours

When you install the PWA, it saves the current theme colours and uses them for the splash screen. So:

- the splash screen background matches whatever theme you had when you installed it
- **changing your theme later does NOT update the splash screen**
- to get a new splash screen colour, uninstall the PWA and install it again

### New icons need a reinstall

Icons work the same way. The PWA caches them when you install it.

- It uses the custom icons set in the admin UI at install time.
- **Changing the icons later does NOT update the installed app.**
- To see new icons, uninstall the PWA and install it again.
- That goes for every icon size (16x16, 32x32, 180x180, 192x192, 512x512).

## Config folder permissions

jotty·page checks `themes.json` and `emojis.json` in `config/` when it loads them. If one is malformed, it logs a warning in the server console and carries on with the built-in themes and emojis.

> [!WARNING]
> The admin panel saves custom themes and emojis into `config/`, so jotty·page needs to be able to write there. A read-only mount breaks saving them.

Set the folder up like this:

```bash
mkdir -p config
chown -R 1000:1000 config/
chmod -R 755 config/
```
