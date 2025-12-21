import { useEffect, useState } from 'react';

export const useThemeColors = () => {
    const [colors, setColors] = useState<Record<string, string>>({
        primary: '#8b3bd0',
        secondary: '#f0e4f9',
        accent: '#f0e4f9',
        muted: '#f0e4f9',
        destructive: '#ef4444',
    });

    useEffect(() => {
        const updateColors = () => {
            if (typeof window === 'undefined') return;

            const root = document.documentElement;
            const computedStyle = getComputedStyle(root);

            const primaryValue = computedStyle.getPropertyValue('--primary').trim();
            const secondaryValue = computedStyle.getPropertyValue('--secondary').trim();
            const accentValue = computedStyle.getPropertyValue('--accent').trim();
            const mutedValue = computedStyle.getPropertyValue('--muted').trim();
            const destructiveValue = computedStyle.getPropertyValue('--destructive').trim();

            const newColors = {
                primary: primaryValue ? `rgb(${primaryValue})` : 'rgb(139, 59, 208)',
                secondary: secondaryValue ? `rgb(${secondaryValue})` : 'rgb(240, 228, 249)',
                accent: accentValue ? `rgb(${accentValue})` : 'rgb(240, 228, 249)',
                muted: mutedValue ? `rgb(${mutedValue})` : 'rgb(240, 228, 249)',
                destructive: destructiveValue ? `rgb(${destructiveValue})` : 'rgb(239, 68, 68)',
            };

            setColors(newColors);
        };

        updateColors();

        const observer = new MutationObserver(updateColors);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    return colors;
};

export const calculateMostActiveSharers = (globalSharing: any) => {
    const sharerCounts: Record<string, number> = {};

    Object.values(globalSharing?.checklists || {}).forEach((entries: any) => {
        if (Array.isArray(entries)) {
            entries.forEach((entry: any) => {
                sharerCounts[entry.sharer] = (sharerCounts[entry.sharer] || 0) + 1;
            });
        }
    });

    Object.values(globalSharing?.notes || {}).forEach((entries: any) => {
        if (Array.isArray(entries)) {
            entries.forEach((entry: any) => {
                sharerCounts[entry.sharer] = (sharerCounts[entry.sharer] || 0) + 1;
            });
        }
    });

    return Object.entries(sharerCounts)
        .map(([username, sharedCount]) => ({ username, sharedCount }))
        .sort((a, b) => b.sharedCount - a.sharedCount)
        .slice(0, 5);
};
