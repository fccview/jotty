"use client";

import { useState, useEffect } from 'react';
import { RwmarkablePlugin } from '@/app/_types/plugins';

export function usePlugins() {
    const [plugins, setPlugins] = useState<RwmarkablePlugin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPlugins();
    }, []);

    const loadPlugins = async () => {
        try {
            const response = await fetch("/api/plugins");
            const data = await response.json();
            if (data.success) {
                setPlugins(data.plugins);
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

    const getEnabledPlugins = () => {
        return plugins.filter(plugin => plugin.enabled);
    };

    return {
        plugins,
        isLoading,
        error,
        loadPlugins,
        getEnabledPlugins
    };
}
