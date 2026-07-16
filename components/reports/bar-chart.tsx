"use client";

import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BarDatum {
  label: string;
  value: number;
}

/** Horizontal bar chart themed for light/dark. */
export function HorizontalBarChart({
  data,
  height = 260,
}: {
  data: BarDatum[];
  height?: number;
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const axis = dark ? "#98A2B3" : "#667085"; // gray-400 / gray-500
  const grid = dark ? "rgba(255,255,255,0.08)" : "#EAECF0";
  const bar = dark ? "#E4A264" : "#DB8533"; // orange-400 / orange-600 (decorative accent)
  const surface = dark ? "#1D2939" : "#FFFFFF";
  const border = dark ? "#344054" : "#EAECF0";
  const text = dark ? "#F9FAFB" : "#101828";

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-text-tertiary"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        barCategoryGap={8}
      >
        <CartesianGrid horizontal={false} stroke={grid} />
        <XAxis
          type="number"
          allowDecimals={false}
          stroke={axis}
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          stroke={axis}
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: grid }}
          contentStyle={{
            background: surface,
            border: `1px solid ${border}`,
            borderRadius: 12,
            color: text,
            fontSize: 13,
          }}
          labelStyle={{ color: text, fontWeight: 600 }}
        />
        <Bar
          dataKey="value"
          radius={[0, 6, 6, 0]}
          maxBarSize={28}
          isAnimationActive={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={bar} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
