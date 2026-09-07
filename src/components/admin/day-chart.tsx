"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDate } from "@/lib/utils";

/**
 * Submissions per day. The x-axis is reversed so time runs right-to-left,
 * matching the reading direction of the rest of the dashboard.
 */
export function DayChart({ data }: { data: Array<{ date: string; count: number }> }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <defs>
            <linearGradient id="day-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-teal-400)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="var(--color-teal-400)" stopOpacity={0.04} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-cream-200)" vertical={false} />

          <XAxis
            dataKey="date"
            reversed
            tickFormatter={(value: string) => formatDate(value)}
            tick={{ fontSize: 11, fill: "var(--color-ink-400)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            orientation="right"
            allowDecimals={false}
            width={36}
            tick={{ fontSize: 11, fill: "var(--color-ink-400)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              direction: "rtl",
              borderRadius: "0.75rem",
              border: "1px solid var(--color-cream-200)",
              fontSize: 13,
            }}
            labelFormatter={(value: string) => formatDate(value)}
            formatter={(value: number) => [String(value), "عدد الردود"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--color-teal-600)"
            strokeWidth={2.5}
            fill="url(#day-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
