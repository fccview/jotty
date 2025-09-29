export interface Item {
    id: string;
    text: string;
    completed: boolean;
    order: number;
    pluginData?: Record<string, any>;
}

export interface Note {
    id: string;
    title: string;
    content: string;
    pluginData?: Record<string, any>;
}

export interface User {
    username: string;
    isAdmin: boolean;
    pluginData?: Record<string, any>;
}

// Plugin system types
export interface PluginHooks {
    data?: {
        transform?: {
            item?: {
                beforeSave?: (item: Item) => Promise<Item>;
                afterLoad?: (item: Item) => Promise<Item>;
            };
            note?: {
                beforeSave?: (note: Note) => Promise<Note>;
                afterLoad?: (note: Note) => Promise<Note>;
            };
            user?: {
                beforeSave?: (user: User) => Promise<User>;
                afterLoad?: (user: User) => Promise<User>;
            };
        };
    };

    ui?: {
        replace?: {
            [key: string]: React.ComponentType<any>;
        };
        modify?: {
            props?: (component: string, props: any) => Promise<any>;
            styles?: (component: string, styles: any) => Promise<any>;
            events?: (component: string, events: any) => Promise<any>;
        };
    };

    core?: {
        init?: (api: PluginAPI) => Promise<void>;
        cleanup?: () => Promise<void>;
    };
}

export interface PluginAPI {
    data: {
        getItem: (id: string) => Promise<Item>;
        updateItem: (item: Item) => Promise<void>;
        getNotes: () => Promise<Note[]>;
        updateNote: (note: Note) => Promise<void>;
    };

    ui: {
        registerComponent: (location: string, component: React.ComponentType<any>) => void;
        replaceComponent: (name: string, component: React.ComponentType<any>) => void;
    };

    storage: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
    };

    events: {
        on: (event: string, handler: (data: any) => void) => void;
        off: (event: string, handler: (data: any) => void) => void;
        emit: (event: string, data: any) => void;
    };
}
