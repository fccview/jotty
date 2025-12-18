# PWA Guide

jotty·page is a fully functional Progressive Web App (PWA) that can be installed on your device for a native app-like experience. This guide covers how to install and customize your PWA experience.

## Installing the PWA

### Automatic Installation Prompt

When you visit jotty·page in a supported browser, you'll automatically see an install prompt that appears as a banner or button. This prompt typically appears:

- On mobile devices when you visit the site
- On desktop Chrome/Edge when you visit frequently
- When the site meets PWA installation criteria

### Manual Installation (if no prompt appears)

If the automatic prompt doesn't appear, you can manually install jotty·page:

#### On Mobile (iOS Safari/Chrome)

1. Open jotty·page in your browser
2. Tap the **Share** button (iOS) or **Menu** button (Android)
3. Select **"Add to Home Screen"** (iOS) or **"Add to Home screen"** (Android)
4. Confirm the installation

#### On Desktop (Chrome/Edge)

1. Click the **Install** button in the address bar (looks like a computer with a down arrow)
2. Or click the **Menu** (⋮) > **More tools** > **Create shortcut**
3. Check **"Open as window"** and click **Create**

#### On Desktop (Firefox)

1. Click the **Menu** (☰) > **More tools** > **Add to desktop**
2. Confirm the installation

## PWA Features

Once installed, jotty·page provides:

- **Offline functionality** - Access your notes and checklists without internet
- **Native app experience** - Launch from home screen or dock
- **Push notifications** - Receive updates (when enabled)
- **Splash screen** - Custom branded loading screen
- **App shortcuts** - Quick access to common actions

## Customizing Your PWA

### Replacing the Manifest

You can completely customize your PWA by creating an override manifest file. This allows you to change the app name, description, icons, colors, and more.

1. Create a file called `site.webmanifest` in your `config/` directory
2. Add your custom manifest configuration:

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

3. Save the file and refresh your PWA
4. The changes will take effect immediately

**Note**: The override manifest takes precedence over any settings configured through the admin UI. Use this for complete customization control.

## Important Notes About PWA Customization

### Theme and Splash Screen Behavior

**Theme colors are "baked in" at install time**

When you install the PWA, the current theme colors are captured and used for the splash screen. This means:

- The splash screen background color matches your current theme at the time of installation
- **Changing your theme after installation will NOT update the splash screen**
- To change the splash screen theme, you must uninstall and reinstall the PWA

### Icon Changes Require Reinstallation

**Icon changes require app reinstallation**

Similar to themes, PWA icons are cached during installation:

- Custom icons set through the admin UI are used when installing
- **Changing icons after installation will NOT update the installed app**
- To see new icons, you must uninstall and reinstall the PWA
- This applies to all icon sizes (16x16, 32x32, 180x180, 192x192, 512x512)

### Managing Installed PWAs

#### Updating an Installed PWA

PWAs update automatically when you visit the website, but you can force an update:

1. Open the installed PWA
2. If an update is available, you'll see a notification
3. Click **"Update"** to apply the latest version

#### Uninstalling a PWA

To remove the installed PWA:

**On Mobile:**

- Long-press the app icon on your home screen
- Select **"Remove"** or **"Delete"**

**On Desktop (Chrome/Edge):**

- Click the **Menu** (⋮) in the app window
- Select **"Uninstall [App Name]"**

**On Desktop (Firefox):**

- Right-click the desktop shortcut
- Select **"Delete"**

**Note**: Some features may be limited in Firefox compared to Chrome-based browsers.
