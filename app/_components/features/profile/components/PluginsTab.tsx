"use client";

import { useState, useEffect } from "react";
import { Puzzle, Folder, Power, Trash2, Settings as SettingsIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/app/_components/ui/elements/button";
import { RwmarkablePlugin } from "@/app/_types/plugins";
import { cn } from "@/app/_utils/utils";

interface PluginsTabProps {
    username: string;
    isAdmin: boolean;
}

export function PluginsTab({ username, isAdmin }: PluginsTabProps) {
    const [plugins, setPlugins] = useState<RwmarkablePlugin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadPlugins();
    }, []);

    const loadPlugins = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/plugins");
            const data = await response.json();
            if (data.success) {
                setPlugins(data.plugins);
            }
        } catch (error) {
            console.error("Error loading plugins:", error);
            setError("Failed to load plugins");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTogglePlugin = async (pluginId: string, enable: boolean) => {
        try {
            const response = await fetch(`/api/plugins/${pluginId}/${enable ? 'enable' : 'disable'}`, {
                method: "POST"
            });

            const data = await response.json();
            if (data.success) {
                setSuccess(`Plugin ${enable ? 'enabled' : 'disabled'} successfully`);
                loadPlugins();

                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(data.error || `Failed to ${enable ? 'enable' : 'disable'} plugin`);

                // Clear error message after 3 seconds
                setTimeout(() => setError(null), 3000);
            }
        } catch (error) {
            console.error("Error toggling plugin:", error);
            setError(`Failed to ${enable ? 'enable' : 'disable'} plugin`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Plugins</h2>
            </div>

            <div className="bg-background border border-border rounded-lg p-6">
                <div className="space-y-4">
                    {/* Error/Success Messages */}
                    {error && (
                        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-4 bg-primary/10 text-primary rounded-lg">
                            {success}
                        </div>
                    )}

                    {/* Local Plugins Section */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            Local Plugins
                        </h3>
                        <div className="space-y-2">
                            {plugins.map(plugin => (
                                <PluginCard
                                    key={plugin.id}
                                    plugin={plugin}
                                    onToggle={handleTogglePlugin}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface PluginCardProps {
    plugin: RwmarkablePlugin;
    onToggle: (id: string, enable: boolean) => Promise<void>;
}

function PluginCard({ plugin, onToggle }: PluginCardProps) {
    return (
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-4">
                {plugin.manifest.previewImage ? (
                    <Image
                        src={plugin.manifest.previewImage}
                        alt={plugin.manifest.displayName}
                        width={48}
                        height={48}
                        className="rounded-lg object-cover"
                    />
                ) : (
                    <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                        <Puzzle className="h-6 w-6 text-muted-foreground" />
                    </div>
                )}
                <div>
                    <h4 className="font-medium">{plugin.manifest.displayName}</h4>
                    <p className="text-sm text-muted-foreground">{plugin.manifest.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                        {plugin.manifest.tags.map(tag => (
                            <span
                                key={tag}
                                className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant={plugin.enabled ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onToggle(plugin.id, !plugin.enabled)}
                    className={cn(
                        "h-8 px-3 flex items-center gap-2",
                        plugin.enabled && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                >
                    <Power className="h-4 w-4" />
                    <span className="text-sm">{plugin.enabled ? 'Enabled' : 'Disabled'}</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                >
                    <SettingsIcon className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}