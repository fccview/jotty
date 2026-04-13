const fs = require('fs');

const path = 'tests/server-actions/sharing.test.ts';
let code = fs.readFileSync(path, 'utf8');

// Replace isItemSharedWith('uuid', 'Category', Type, 'user')  -> isItemSharedWith('uuid', Type, 'user')
code = code.replace(/isItemSharedWith\('([^']+)',\s*'([^']*)',\s*(ItemTypes\.[A-Z_]+),\s*'([^']+)'\)/g, "isItemSharedWith('$1', $3, '$4')");

// Replace getItemPermissions
code = code.replace(/getItemPermissions\('([^']+)',\s*'([^']*)',\s*(ItemTypes\.[A-Z_]+),\s*'([^']+)'\)/g, "getItemPermissions('$1', $3, '$4')");

// Replace canUserReadItem
code = code.replace(/canUserReadItem\('([^']+)',\s*'([^']*)',\s*(ItemTypes\.[A-Z_]+),\s*'([^']+)'\)/g, "canUserReadItem('$1', $3, '$4')");

// Replace canUserWriteItem
code = code.replace(/canUserWriteItem\('([^']+)',\s*'([^']*)',\s*(ItemTypes\.[A-Z_]+),\s*'([^']+)'\)/g, "canUserWriteItem('$1', $3, '$4')");

// Replace canUserDeleteItem
code = code.replace(/canUserDeleteItem\('([^']+)',\s*'([^']*)',\s*(ItemTypes\.[A-Z_]+),\s*'([^']+)'\)/g, "canUserDeleteItem('$1', $3, '$4')");

// Replace checkUserPermission('uuid', 'Category', Type, 'user', PermissionTypes.READ)
code = code.replace(/checkUserPermission\('([^']+)',\s*'([^']*)',\s*(ItemTypes\.[A-Z_]+),\s*'([^']+)',\s*(PermissionTypes\.[A-Z_]+)\)/g, "checkUserPermission('$1', $3, '$4', $5)");

// Handle unshareWith('uuid', 'Category', 'sharer', 'receiver', ItemTypes.CHECKLIST) -> Wait, let me check unshareWith signature
fs.writeFileSync(path, code);
console.log('Fixed sharing test signatures');
