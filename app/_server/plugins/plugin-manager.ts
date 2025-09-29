import { RwmarkablePlugin, BaseItem, BaseProps, PluginHooks } from '@/app/_types/plugins';

export class PluginManager {
    private static instance: PluginManager;
    private plugins: Map<string, RwmarkablePlugin> = new Map();

    private constructor() { }

    static getInstance(): PluginManager {
        if (!PluginManager.instance) {
            PluginManager.instance = new PluginManager();
        }
        return PluginManager.instance;
    }

    setPlugins(plugins: RwmarkablePlugin[]) {
        this.plugins = new Map(plugins.map(p => [p.id, p]));
    }

    getEnabledPlugins(): RwmarkablePlugin[] {
        return Array.from(this.plugins.values()).filter(p => p.enabled);
    }

    // Data Transform Hooks
    transformItem(item: BaseItem): BaseItem {
        let result = { ...item };
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['data.transform.item']) {
                result = plugin.hooks['data.transform.item'](result);
            }
        }
        return result;
    }

    transformList(list: { items: BaseItem[] }): { items: BaseItem[] } {
        let result = { ...list };
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['data.transform.list']) {
                result = plugin.hooks['data.transform.list'](result);
            }
        }
        return result;
    }

    validateItem(item: BaseItem): { isValid: boolean; error?: string } {
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['data.validate.item']) {
                const result = plugin.hooks['data.validate.item'](item);
                if (typeof result === 'boolean') {
                    if (!result) return { isValid: false };
                } else if (!result.isValid) {
                    return result;
                }
            }
        }
        return { isValid: true };
    }

    // UI Hooks
    wrapComponent<T extends BaseProps>(
        componentType: 'ChecklistItem' | 'ChecklistHeader',
        BaseComponent: React.ComponentType<T>,
        props: T
    ): React.ComponentType<T> {
        let WrappedComponent: React.ComponentType<T> = BaseComponent;
        const hookName = `ui.replace.${componentType}` as keyof PluginHooks;

        for (const plugin of this.getEnabledPlugins()) {
            const hook = plugin.hooks[hookName];
            if (hook) {
                const CurrentComponent = WrappedComponent;
                const WrappedWithPlugin = function (componentProps: T) {
                    const hookFn = hook as (props: any) => JSX.Element;
                    return hookFn({
                        ...componentProps,
                        component: CurrentComponent,
                        item: componentProps.item,
                        onUpdate: componentProps.onUpdate
                    });
                };
                // Add display name for debugging
                WrappedWithPlugin.displayName = `${plugin.manifest.name}_${componentType}`;
                WrappedComponent = WrappedWithPlugin as unknown as React.ComponentType<T>;
            }
        }

        return WrappedComponent;
    }

    modifyProps(props: BaseProps): BaseProps {
        let result = { ...props };
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['ui.modify.props']) {
                result = plugin.hooks['ui.modify.props'](result);
            }
        }
        return result;
    }

    getItemActions(props: { item: BaseItem; onUpdate: (item: BaseItem) => void }): React.ReactElement[] {
        const actions: React.ReactElement[] = [];
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['ui.add.itemActions']) {
                actions.push(...plugin.hooks['ui.add.itemActions'](props));
            }
        }
        return actions;
    }

    getListActions(props: { list: { items: BaseItem[] }; onUpdate: (list: { items: BaseItem[] }) => void }): React.ReactElement[] {
        const actions: React.ReactElement[] = [];
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['ui.add.listActions']) {
                actions.push(...plugin.hooks['ui.add.listActions'](props));
            }
        }
        return actions;
    }

    // Action Hooks
    async beforeCreateItem(item: BaseItem): Promise<BaseItem | false> {
        let result = { ...item };
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['action.before.createItem']) {
                const hookResult = plugin.hooks['action.before.createItem'](result);
                if (hookResult === false) return false;
                result = hookResult;
            }
        }
        return result;
    }

    async afterCreateItem(item: BaseItem): Promise<void> {
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['action.after.createItem']) {
                await plugin.hooks['action.after.createItem'](item);
            }
        }
    }

    async beforeUpdateItem(item: BaseItem, prevItem: BaseItem): Promise<BaseItem | false> {
        let result = { ...item };
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['action.before.updateItem']) {
                const hookResult = plugin.hooks['action.before.updateItem'](result, prevItem);
                if (hookResult === false) return false;
                result = hookResult;
            }
        }
        return result;
    }

    async afterUpdateItem(item: BaseItem, prevItem: BaseItem): Promise<void> {
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['action.after.updateItem']) {
                await plugin.hooks['action.after.updateItem'](item, prevItem);
            }
        }
    }

    async beforeDeleteItem(item: BaseItem): Promise<boolean> {
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['action.before.deleteItem']) {
                if (!plugin.hooks['action.before.deleteItem'](item)) {
                    return false;
                }
            }
        }
        return true;
    }

    async afterDeleteItem(item: BaseItem): Promise<void> {
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['action.after.deleteItem']) {
                await plugin.hooks['action.after.deleteItem'](item);
            }
        }
    }

    // Storage Hooks
    serializeItem(item: BaseItem): any {
        let result = { ...item };
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['storage.serialize.item']) {
                result = plugin.hooks['storage.serialize.item'](result);
            }
        }
        return result;
    }

    deserializeItem(data: any): BaseItem {
        let result = { ...data };
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['storage.deserialize.item']) {
                result = plugin.hooks['storage.deserialize.item'](result);
            }
        }
        return result;
    }

    migrateData(data: any, fromVersion: string, toVersion: string): any {
        let result = { ...data };
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks['storage.migrate']) {
                result = plugin.hooks['storage.migrate'](result, fromVersion, toVersion);
            }
        }
        return result;
    }
}
