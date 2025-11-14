"use client";

import dynamic from "next/dynamic";
import { useThemeColors } from "./AdminSharingFunctions";

const ResponsiveNetwork = dynamic(
    () => import("@nivo/network").then((mod) => mod.ResponsiveNetwork),
    { ssr: false }
);

export const SharingNetworkGraph = ({ data }: { data: any }) => {
    const colors = useThemeColors();
    if (!data || data.nodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                Not enough sharing data to display a network graph.
            </div>
        );
    }

    return (
        <div className="h-[500px] w-full">
            <ResponsiveNetwork
                data={data}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                linkDistance={(e: any) => e.distance}
                centeringStrength={0.3}
                repulsivity={6}
                nodeSize={(n: any) => n.size}
                activeNodeSize={(n: any) => n.size * 1.5}
                nodeColor={(e: any) => e.color}
                nodeBorderWidth={1}
                nodeBorderColor={{
                    from: "color",
                    modifiers: [["darker", 0.8]],
                }}
                linkThickness={2}
                linkBlendMode="multiply"
                motionConfig="wobbly"
            />
        </div>
    );
};
