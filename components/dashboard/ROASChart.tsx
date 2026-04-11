"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ROASDataPoint {
  platform: string;
  roas: number;
}

interface ROASChartProps {
  data: ROASDataPoint[];
}

const PLATFORM_COLORS: Record<string, string> = {
  META: "#4F6EF7",
  TIKTOK: "#06B6D4",
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "13px",
        }}
      >
        <p style={{ margin: "0 0 4px", color: "var(--text2)", fontSize: "12px" }}>
          {label}
        </p>
        <p
          style={{
            margin: 0,
            color: "var(--text)",
            fontWeight: "700",
            fontFamily: "Space Mono, monospace",
            fontSize: "15px",
          }}
        >
          {payload[0].value.toFixed(2)}x ROAS
        </p>
      </div>
    );
  }
  return null;
};

export default function ROASChart({ data }: ROASChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text3)",
          fontSize: "14px",
        }}
      >
        No ROAS data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        barCategoryGap="40%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="platform"
          tick={{ fill: "var(--text2)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `${v.toFixed(1)}x`}
          tick={{ fill: "var(--text2)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="roas" name="ROAS" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.platform}
              fill={PLATFORM_COLORS[entry.platform] || "var(--accent)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
