"use client";

import { useState, useEffect } from "react";
import { LucideIcon, Palette } from "lucide-react";

interface DynamicIconProps {
    iconName: string;
    fallbackIcon?: LucideIcon;
    className?: string;
}

export const DynamicIcon = ({
    iconName,
    fallbackIcon: FallbackIcon = Palette,
    className = "h-4 w-4"
}: DynamicIconProps) => {
    const [IconComponent, setIconComponent] = useState<LucideIcon | null>(null);

    useEffect(() => {
        if (!iconName) {
            setIconComponent(FallbackIcon);
            return;
        }

        import("lucide-react")
            .then((lucide) => {
                const icon = (lucide as any)[iconName] as LucideIcon;
                if (icon) {
                    setIconComponent(() => icon);
                } else {
                    setIconComponent(FallbackIcon);
                }
            })
            .catch(() => {
                setIconComponent(FallbackIcon);
            });
    }, [iconName, FallbackIcon]);

    if (!IconComponent) {
        return <FallbackIcon className={className} />;
    }

    return <IconComponent className={className} />;
};
