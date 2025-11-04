"use client";

import dynamic from "next/dynamic";
import { useThemeColors } from "./AdminSharingFunctions";
import { Legend } from "recharts";

const ResponsiveContainer = dynamic(
    () => import("recharts").then((mod) => mod.ResponsiveContainer),
    { ssr: false }
);
const PieChart = dynamic(
    () => import("recharts").then((mod) => mod.PieChart),
    { ssr: false }
);
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), {
    ssr: false,
});
const Cell = dynamic(() => import("recharts").then((mod) => mod.Cell), {
    ssr: false,
});
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), {
    ssr: false,
});

export const ShareTypePieChart = ({ data }: { data: any[] }) => {
    const colors = useThemeColors();
    const PIE_COLORS = [
        colors.primary,
        colors.secondary,
        colors.accent,
        colors.destructive,
    ];
    return (
        <ResponsiveContainer width="100%" height={350}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    innerRadius={40}
                    fill={colors.primary}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        color: "hsl(var(--popover-foreground))",
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value, name) => [`${value} items`, name]}
                />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};
