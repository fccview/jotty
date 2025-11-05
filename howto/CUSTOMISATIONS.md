# Custom Manifest

You can completely customize your PWA by creating an override manifest file. This allows you to change the app name, description, icons, colors, and more.

**Note**: Custom themes and emojis can now be managed through the admin UI under **Admin → Styling**. The manifest customization below is for advanced PWA configuration.

### Custom manifest

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

Learn more about how the PWA works visiting [howto/PWA.md](howto/PWA.md)

**Note**: The override manifest takes precedence over any settings configured through the admin UI. Use this for complete customization control.

### Configuration Validation

The app validates your configuration files and will show warnings in the console if there are any format errors. Invalid configs will be ignored and the app will continue working with built-in themes and emojis.

**Important:** If you want to use custom themes and emojis, make sure your local `config/` directory has the correct permissions:

```bash
mkdir -p config
chown -R 1000:1000 config/
chmod -R 755 config/
```
