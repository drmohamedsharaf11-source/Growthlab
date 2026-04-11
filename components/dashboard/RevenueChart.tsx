"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  revenue: number;
  adSpend: number;
}

interface RevenueChartProps {
  data: DataPoint[];
}

function formatCurrency(val: number): string {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toFixed(0);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "12px 14px",
          fontSize: "13px",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            color: "var(--text2)",
            fontSize: "12px",
          }}
        >
          {label ? formatDate(label) : ""}
        </p>
        {payload.map((entry) => (
          <div
            key={entry.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                background: entry.color,
              }}
            />
            <span style={{ color: "var(--text2)" }}>{entry.name}:</span>
            <span
              style={{
                color: "var(--text)",
                fontWeight: "600",
                fontFamily: "Space Mono, monospace",
                fontSize: "12px",
              }}
            >
              {formatCurrency(entry.value)} EGP
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function RevenueChart({ data }: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: "240px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text3)",
          fontSize: "14px",
        }}
      >
        No revenue data for this period
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    date: formatDate(d.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={formattedData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--text2)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCurrency}
          tick={{ fill: "var(--text2)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "12px", color: "var(--text2)" }}
          iconType="circle"
          iconSize={8}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#4F6EF7"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: "#4F6EF7" }}
        />
        <Line
          type="monotone"
          dataKey="adSpend"
          name="Ad Spend"
          stroke="#7C3AED"
          strokeWidth={2}
          dot={false}
          strokeDasharray="5 3"
          activeDot={{ r: 4, fill: "#7C3AED" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
