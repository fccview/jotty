"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { RwmarkablePlugin, BaseItem, BaseProps } from '@/app/_types/plugins';
import { PluginManager } from '@/app/_server/plugins/plugin-manager';

interface PluginContextType {
    plugins: RwmarkablePlugin[];
    isLoading: boolean;
    error: string | null;
    wrapComponent: <T extends BaseProps>(
        componentType: 'ChecklistItem' | 'ChecklistHeader',
        BaseComponent: React.ComponentType<T>,
        props: T
    ) => React.ComponentType<T>;
}

const PluginContext = createContext<PluginContextType | null>(null);

export function PluginProvider({ children }: { children: React.ReactNode }) {
    const [plugins, setPlugins] = useState<RwmarkablePlugin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPlugins();
    }, []);

    const loadPlugins = async () => {
        try {
            console.log('Loading plugins...');
            const response = await fetch("/api/plugins");
            console.log('Plugin API response:', response);
            const data = await response.json();
            console.log('Plugin data:', data);
            if (data.success) {
                setPlugins(data.plugins);
                console.log('Plugins loaded:', data.plugins);
            } else {
                setError("Failed to load plugins");
            }
        } catch (error) {
            console.error("Error loading plugins:", error);
            setError("Failed to load plugins");
        } finally {
            setIsLoading(false);
        }
    };

    const wrapComponent = <T extends BaseProps>(
        componentType: 'ChecklistItem' | 'ChecklistHeader',
        BaseComponent: React.ComponentType<T>,
        props: T
    ): React.ComponentType<T> => {
        console.log('Wrapping component:', componentType);
        console.log('Available plugins:', plugins);
        console.log('Props:', props);

        let WrappedComponent: React.ComponentType<T> = BaseComponent;

        // Only apply plugins that are enabled
        const enabledPlugins = plugins.filter(plugin => plugin.enabled);
        console.log('All plugins:', plugins);
        console.log('Enabled plugins:', enabledPlugins);
        console.log('Plugin enabled states:', plugins.map(p => ({ name: p.manifest.name, enabled: p.enabled })));

        for (const plugin of enabledPlugins) {
            console.log('Applying plugin:', plugin.manifest.name);
            const hook = plugin.hooks[`ui.replace.${componentType}`];
            if (hook) {
                console.log('Found hook for component:', componentType);
                const CurrentComponent = WrappedComponent;
                const WrappedWithPlugin = (componentProps: T) => {
                    console.log('Rendering wrapped component with props:', componentProps);
                    return hook({
                        ...componentProps,
                        component: CurrentComponent,
                        item: componentProps.item,
                        onUpdate: componentProps.onUpdate
                    });
                };
                WrappedWithPlugin.displayName = `${plugin.manifest.name}_${componentType}`;
                WrappedComponent = WrappedWithPlugin as unknown as React.ComponentType<T>;
            }
        }

        return WrappedComponent;
    };

    const value: PluginContextType = {
        plugins,
        isLoading,
        error,
        wrapComponent
    };

    return (
        <PluginContext.Provider value={value}>
            {children}
        </PluginContext.Provider>
    );
}

export function usePlugins() {
    const context = useContext(PluginContext);
    if (!context) {
        throw new Error('usePlugins must be used within a PluginProvider');
    }
    return context;
}