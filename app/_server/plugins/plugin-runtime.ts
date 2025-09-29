import { RwmarkablePlugin, RwmarkableManifest } from '@/app/_types/plugins';
import path from 'path';
import fs from 'fs/promises';
import { PluginStateManager } from './plugin-state';

export class PluginRuntime {
    private static instance: PluginRuntime;
    private plugins: Map<string, RwmarkablePlugin> = new Map();
    private stateManager = PluginStateManager.getInstance();

    private constructor() {
        // Initialize plugin state
        this.stateManager.init().catch(error => {
            console.error('Failed to initialize plugin state:', error);
        });
    }

    static getInstance(): PluginRuntime {
        if (!PluginRuntime.instance) {
            PluginRuntime.instance = new PluginRuntime();
        }
        return PluginRuntime.instance;
    }

    async discoverLocalPlugins(): Promise<RwmarkablePlugin[]> {
        const pluginsDir = path.join(process.cwd(), 'plugins');
        console.log('Looking for plugins in:', pluginsDir);

        try {
            const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
            const pluginDirs = entries.filter(entry => entry.isDirectory());

            const plugins: RwmarkablePlugin[] = [];

            for (const dir of pluginDirs) {
                const manifestPath = path.join(pluginsDir, dir.name, 'rwmarkable-manifest.json');
                try {
                    console.log('Checking manifest:', manifestPath);
                    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
                    console.log('Found manifest:', manifestContent);
                    const manifest = JSON.parse(manifestContent) as RwmarkableManifest;

                    // Import the plugin module (will be handled by Next.js build)
                    console.log('Importing plugin module from:', `@/plugins/${dir.name}/src`);
                    const pluginModule = await import(`@/plugins/${dir.name}/src`);
                    console.log('Plugin module loaded:', pluginModule);
                    const hooks = pluginModule.default;
                    console.log('Plugin hooks:', hooks);

                    const plugin: RwmarkablePlugin = {
                        id: manifest.name,
                        manifest,
                        enabled: await this.stateManager.isPluginEnabled(manifest.name),
                        hooks
                    };

                    console.log('Created plugin instance:', plugin);
                    plugins.push(plugin);
                    this.plugins.set(plugin.id, plugin);

                    // Log plugin hooks for debugging
                    console.log(`Plugin ${manifest.name} hooks:`, Object.keys(hooks));
                } catch (error) {
                    console.error(`Failed to load plugin from ${dir.name}:`, error);
                }
            }

            return plugins;
        } catch (error) {
            console.error('Failed to read plugins directory:', error);
            return [];
        }
    }

    async enablePlugin(id: string): Promise<void> {
        console.log('Enabling plugin:', id);
        console.log('Available plugins:', Array.from(this.plugins.keys()));
        const plugin = this.plugins.get(id);
        if (!plugin) throw new Error('Plugin not found');
        
        await this.stateManager.enablePlugin(id);
        plugin.enabled = true;
        
        console.log('Plugin enabled:', plugin);
        console.log('Plugin hooks:', Object.keys(plugin.hooks));
    }

    async disablePlugin(id: string): Promise<void> {
        const plugin = this.plugins.get(id);
        if (!plugin) throw new Error('Plugin not found');
        
        await this.stateManager.disablePlugin(id);
        plugin.enabled = false;
    }

    getPlugin(id: string): RwmarkablePlugin | undefined {
        return this.plugins.get(id);
    }

    getEnabledPlugins(): RwmarkablePlugin[] {
        const enabled = Array.from(this.plugins.values())
            .filter(plugin => plugin.enabled);
        console.log('Enabled plugins:', enabled);
        return enabled;
    }

    getAllPlugins(): RwmarkablePlugin[] {
        return Array.from(this.plugins.values());
    }
}