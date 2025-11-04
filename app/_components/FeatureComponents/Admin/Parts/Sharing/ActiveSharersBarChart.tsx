"use client";

import dynamic from "next/dynamic";
import { MostActiveSharer } from "@/app/_types";
import { useThemeColors } from "@/app/_components/FeatureComponents/Admin/Parts/Sharing/AdminSharingFunctions";

const ResponsiveContainer = dynamic(
    () => import("recharts").then((mod) => mod.ResponsiveContainer),
    { ssr: false }
);
const BarChart = dynamic(
    () => import("recharts").then((mod) => mod.BarChart),
    { ssr: false }
);
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), {
    ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), {
    ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), {
    ssr: false,
});
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), {
    ssr: false,
});

export const ActiveSharersBarChart = ({ data }: { data: MostActiveSharer[] }) => {
    const colors = useThemeColors();

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
                <XAxis
                    dataKey="username"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    className="text-xs text-muted-foreground"
                />
                <YAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    className="text-xs text-muted-foreground"
                />
                <Tooltip
                    cursor={{ fill: `${colors.primary}20` }}
                    contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        color: "hsl(var(--popover-foreground))",
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                />
                <Bar
                    dataKey="sharedCount"
                    fill={colors.primary}
                    radius={[0, 4, 4, 0]}
                    barSize={40}
                />
            </BarChart>
        </ResponsiveContainer>
    );
};
