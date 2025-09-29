import fs from 'fs/promises';
import path from 'path';

interface PluginState {
    enabledPlugins: string[];  // Array of plugin IDs
}

export class PluginStateManager {
    private static instance: PluginStateManager;
    private statePath: string;
    private state: PluginState = { enabledPlugins: [] };

    private constructor() {
        this.statePath = path.join(process.cwd(), 'data', 'plugin-state.json');
    }

    static getInstance(): PluginStateManager {
        if (!PluginStateManager.instance) {
            PluginStateManager.instance = new PluginStateManager();
        }
        return PluginStateManager.instance;
    }

    async init() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.statePath);
            await fs.mkdir(dataDir, { recursive: true });

            // Try to read existing state
            try {
                const data = await fs.readFile(this.statePath, 'utf-8');
                this.state = JSON.parse(data);
            } catch (error) {
                // If file doesn't exist or is invalid, use default state
                await this.saveState();
            }
        } catch (error) {
            console.error('Failed to initialize plugin state:', error);
            throw error;
        }
    }

    private async saveState() {
        try {
            await fs.writeFile(this.statePath, JSON.stringify(this.state, null, 2));
        } catch (error) {
            console.error('Failed to save plugin state:', error);
            throw error;
        }
    }

    async isPluginEnabled(pluginId: string): Promise<boolean> {
        return this.state.enabledPlugins.includes(pluginId);
    }

    async enablePlugin(pluginId: string): Promise<void> {
        if (!this.state.enabledPlugins.includes(pluginId)) {
            this.state.enabledPlugins.push(pluginId);
            await this.saveState();
        }
    }

    async disablePlugin(pluginId: string): Promise<void> {
        this.state.enabledPlugins = this.state.enabledPlugins.filter(id => id !== pluginId);
        await this.saveState();
    }

    async getEnabledPlugins(): Promise<string[]> {
        return this.state.enabledPlugins;
    }
}
