export interface RwmarkableManifest {
    name: string;
    displayName: string;
    version: string;
    description: string;
    author: string;
    tags: string[];
    main: string;
    hooks: Array<keyof PluginHooks>;
    previewImage?: string;
}

// Base types for items that plugins can modify
export interface BaseItem {
    id: string;
    text: string;
    completed: boolean;
    pluginData?: Record<string, any>;
    [key: string]: any;
}

export interface BaseProps {
    [key: string]: any;
}

// Plugin Hook Types
export interface DataTransformHooks {
    'data.transform.item': (item: BaseItem) => BaseItem;
    'data.transform.list': (list: { items: BaseItem[] }) => { items: BaseItem[] };
    'data.validate.item': (item: BaseItem) => boolean | { isValid: boolean; error?: string };
}

export interface UIHooks {
    'ui.replace.ChecklistItem': (props: {
        component: React.ComponentType<any>;
        item: BaseItem;
        onUpdate: (item: BaseItem) => void;
        [key: string]: any;
    }) => JSX.Element;
    'ui.replace.ChecklistHeader': (props: {
        component: React.ComponentType<any>;
        list: { items: BaseItem[] };
        onUpdate: (list: { items: BaseItem[] }) => void;
        [key: string]: any;
    }) => JSX.Element;
    'ui.modify.props': (props: BaseProps) => BaseProps;
    'ui.add.itemActions': (props: {
        item: BaseItem;
        onUpdate: (item: BaseItem) => void;
    }) => React.ReactElement[];
    'ui.add.listActions': (props: {
        list: { items: BaseItem[] };
        onUpdate: (list: { items: BaseItem[] }) => void;
    }) => React.ReactElement[];
}

export interface ActionHooks {
    'action.before.createItem': (item: BaseItem) => BaseItem | false;
    'action.after.createItem': (item: BaseItem) => void;
    'action.before.updateItem': (item: BaseItem, prevItem: BaseItem) => BaseItem | false;
    'action.after.updateItem': (item: BaseItem, prevItem: BaseItem) => void;
    'action.before.deleteItem': (item: BaseItem) => boolean;
    'action.after.deleteItem': (item: BaseItem) => void;
}

export interface StorageHooks {
    'storage.serialize.item': (item: BaseItem) => any;
    'storage.deserialize.item': (data: any) => BaseItem;
    'storage.migrate': (data: any, fromVersion: string, toVersion: string) => any;
}

export interface PluginHooks extends
    Partial<DataTransformHooks>,
    Partial<UIHooks>,
    Partial<ActionHooks>,
    Partial<StorageHooks> { }

export interface RwmarkablePlugin {
    id: string;
    manifest: RwmarkableManifest;
    enabled: boolean;
    hooks: PluginHooks;
}