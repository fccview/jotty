# Checklist Plugin System

The Checklist app supports a powerful plugin system that allows extending functionality without modifying the core codebase.

## For Users

### Installing Plugins

1. Plugins are loaded from the `plugins` directory in your Checklist installation
2. Each plugin has its own directory with a `rwmarkable-manifest.json` file
3. To install a plugin:
   - Create a new directory in `plugins` with the plugin name
   - Copy the plugin files into this directory
   - Restart the application
4. Manage plugins through Settings → Plugins tab:
   - Enable/disable plugins
   - Configure plugin settings (if available)
   - Remove plugins

### Available Plugins

- **Subtasks & Labels** (`subtasks-and-labels`): Add subtasks and custom labels to your checklist items

## For Developers

### Plugin Structure

```
plugins/
  your-plugin-name/
    rwmarkable-manifest.json  # Plugin metadata and configuration
    src/
      index.ts               # Plugin entry point
      components/           # React components
      types.ts             # TypeScript types
```

### Manifest File (rwmarkable-manifest.json)

```json
{
  "name": "your-plugin-name",
  "displayName": "Your Plugin Display Name",
  "version": "1.0.0",
  "description": "What your plugin does",
  "author": "Your Name",
  "tags": ["tag1", "tag2"],
  "main": "src/index.ts",
  "hooks": [
    "hook.name.1",
    "hook.name.2"
  ]
}
```

### Available Hooks

1. **Data Transformation**
   - `data.transform.item`: Transform checklist items
   ```typescript
   (item: any) => transformedItem
   ```

2. **UI Components**
   - `ui.replace.ChecklistItem`: Replace the default checklist item component
   ```typescript
   (props: any) => React.Component
   ```
   - `ui.modify.props`: Modify component props
   ```typescript
   (props: any) => modifiedProps
   ```

### Development Guidelines

1. **Use ES Modules**
   - Always use ESM syntax (import/export) instead of CommonJS (require/module.exports)
   - Required for Next.js App Router compatibility

2. **Client Components**
   - Add "use client" directive to components using React hooks
   ```typescript
   "use client";
   import React, { useState } from 'react';
   ```

3. **TypeScript**
   - Use TypeScript for better type safety
   - Define interfaces for your plugin's data structures

### Example Plugin

Check out the `subtasks` plugin for a complete example of:
- Component replacement
- Data transformation
- UI integration
- TypeScript usage
- React hooks

### Best Practices

1. **Isolation**: Keep your plugin's data namespace-isolated using a unique key
   ```typescript
   item.pluginData['your-plugin-name']
   ```

2. **Performance**: 
   - Minimize unnecessary re-renders
   - Use React.memo for pure components
   - Batch state updates

3. **Error Handling**:
   - Gracefully handle missing or invalid data
   - Provide meaningful error messages
   - Don't crash the main application

4. **UI/UX**:
   - Follow the app's design system
   - Use existing UI components when possible
   - Maintain consistent styling

### Testing Your Plugin

1. Place your plugin in the `plugins` directory
2. Restart the application
3. Enable the plugin in Settings → Plugins
4. Test all functionality thoroughly
5. Check console for errors
