import fs from 'fs/promises';
import path from 'path';

export async function ensurePluginsDir() {
    const pluginsDir = path.join(process.cwd(), 'plugins');
    try {
        await fs.access(pluginsDir);
    } catch {
        console.log('Creating plugins directory:', pluginsDir);
        await fs.mkdir(pluginsDir, { recursive: true });
    }
    return pluginsDir;
}
