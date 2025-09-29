declare module '@rwmarkable/plugin-sdk' {
    export interface Item {
        id: string;
        text: string;
        completed: boolean;
        order: number;
        pluginData?: Record<string, any>;
    }

    export interface PluginHooks {
        data?: {
            transform?: {
                item?: {
                    beforeSave?: (item: Item) => Promise<Item>;
                    afterLoad?: (item: Item) => Promise<Item>;
                };
            };
        };
        ui?: {
            replace?: {
                [key: string]: React.ComponentType<any>;
            };
        };
    }
}
