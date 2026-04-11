"use client";

import { Period } from "@/types";

interface PeriodSwitcherProps {
  period: Period;
  onChange: (period: Period) => void;
}

const PERIODS: { label: string; value: Period }[] = [
  { label: "Daily", value: "DAILY" },
  { label: "Weekly", value: "WEEKLY" },
  { label: "Bi-weekly", value: "BIWEEKLY" },
  { label: "Monthly", value: "MONTHLY" },
];

export default function PeriodSwitcher({ period, onChange }: PeriodSwitcherProps) {
  return (
    <div
      style={{
        display: "flex",
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "3px",
        gap: "2px",
      }}
    >
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          style={{
            padding: "5px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: period === p.value ? "600" : "400",
            color: period === p.value ? "var(--text)" : "var(--text2)",
            background: period === p.value ? "var(--surface3)" : "transparent",
            border: "none",
            cursor: "pointer",
            transition: "all 0.15s",
            fontFamily: "DM Sans, sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
