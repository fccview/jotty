"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { SlashCommandItem } from "./SlashCommands";
import { cn } from "@/app/_utils/global-utils";

interface SlashCommandsListProps {
    items: SlashCommandItem[];
    command: (item: SlashCommandItem) => void;
}

export const SlashCommandsList = forwardRef<
    { onKeyDown: (event: KeyboardEvent) => boolean },
    SlashCommandsListProps
>(({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = items[index];
        if (item) {
            command(item);
        }
    };

    const upHandler = () => {
        const newIndex = selectedIndex - 2;
        if (newIndex < 0) {
            const bottomRowStart = Math.floor((items.length - 1) / 2) * 2;
            setSelectedIndex(Math.min(bottomRowStart + (selectedIndex % 2), items.length - 1));
        } else {
            setSelectedIndex(newIndex);
        }
    };

    const downHandler = () => {
        const newIndex = selectedIndex + 2;
        if (newIndex >= items.length) {
            setSelectedIndex(selectedIndex % 2);
        } else {
            setSelectedIndex(newIndex);
        }
    };

    const leftHandler = () => {
        if (selectedIndex % 2 === 1) {
            setSelectedIndex(selectedIndex - 1);
        }
    };

    const rightHandler = () => {
        if (selectedIndex % 2 === 0 && selectedIndex + 1 < items.length) {
            setSelectedIndex(selectedIndex + 1);
        }
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: (event: KeyboardEvent) => {
            if (event.key === "ArrowUp") {
                upHandler();
                return true;
            }

            if (event.key === "ArrowDown") {
                downHandler();
                return true;
            }

            if (event.key === "ArrowLeft01Icon") {
                leftHandler();
                return true;
            }

            if (event.key === "ArrowRight") {
                rightHandler();
                return true;
            }

            if (event.key === "Enter") {
                enterHandler();
                return true;
            }

            return false;
        },
    }));

    return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-2 min-w-80 max-w-96">
            {items.length ? (
                <div className="grid grid-cols-2 gap-1">
                    {items.map((item, index) => (
                        <button
                            key={index}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 text-left rounded-md text-sm transition-colors border",
                                index === selectedIndex
                                    ? "bg-accent text-accent-foreground border-primary"
                                    : "hover:bg-accent/50 border-transparent"
                            )}
                            onClick={() => selectItem(index)}
                        >
                            <div className="flex-shrink-0 text-muted-foreground">
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-xs">{item.title}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {item.description}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                    No results found
                </div>
            )}
        </div>
    );
});

SlashCommandsList.displayName = "SlashCommandsList";
