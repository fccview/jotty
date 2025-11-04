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

export const transformGlobalSharingToNetworkData = (globalSharing: any, colors: Record<string, string>) => {
    const nodes = new Map();
    const links = new Set<string>();
    const linkCounts: Record<string, number> = {};

    const addNode = (
        username: string,
        type: "sharer" | "receiver" | "public"
    ) => {
        if (!nodes.has(username)) {
            let color = colors.primary;
            if (type === "sharer") color = colors.accent;
            if (type === "receiver") color = colors.secondary;
            if (type === "public") color = colors.muted;

            nodes.set(username, {
                id: username,
                size: 10,
                shareCount: 0,
                receiveCount: 0,
                color: color,
            });
        }
    };

    const processShares = (sharingMap: any) => {
        if (!sharingMap) return;

        Object.entries(sharingMap).forEach(([receiver, entries]: [string, any]) => {
            addNode(receiver, receiver === "public" ? "public" : "receiver");
            if (nodes.has(receiver)) {
                nodes.get(receiver).receiveCount += Array.isArray(entries)
                    ? entries.length
                    : 0;
            }

            if (Array.isArray(entries)) {
                entries.forEach((entry: any) => {
                    const sharer = entry.sharer;
                    addNode(sharer, "sharer");

                    if (nodes.has(sharer)) {
                        nodes.get(sharer).shareCount += 1;
                    }

                    const linkId = `${sharer}-${receiver}`;
                    if (sharer !== receiver) {
                        links.add(linkId);
                        linkCounts[linkId] = (linkCounts[linkId] || 0) + 1;
                    }
                });
            }
        });
    };

    processShares(globalSharing?.checklists);
    processShares(globalSharing?.notes);

    nodes.forEach((node) => {
        const totalActivity = node.shareCount + node.receiveCount;
        node.size = 10 + Math.min(totalActivity * 2, 20);
        if (node.shareCount > node.receiveCount) {
            node.color = colors.accent;
        }
    });

    const formattedNodes = Array.from(nodes.values());
    const formattedLinks = Array.from(links).map((linkId) => {
        const [source, target] = linkId.split("-");
        return {
            source,
            target,
            distance: 60,
        };
    });

    return { nodes: formattedNodes, links: formattedLinks };
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
