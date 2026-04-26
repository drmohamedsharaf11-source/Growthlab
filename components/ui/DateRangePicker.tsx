"use client";

import { useState } from "react";

export interface DateRange {
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;
}

interface Preset {
  label: string;
  days: number;
}

const PRESETS: Preset[] = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function presetRange(days: number): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);
  return { startDate: toDateStr(start), endDate: toDateStr(end) };
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [custom, setCustom] = useState(false);

  const activePreset = PRESETS.find((p) => {
    const pr = presetRange(p.days);
    return pr.startDate === value.startDate && pr.endDate === value.endDate;
  });

  const handlePreset = (days: number) => {
    setCustom(false);
    onChange(presetRange(days));
  };

  const handleCustom = () => {
    setCustom(true);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => handlePreset(p.days)}
            style={{
              padding: "5px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: !custom && activePreset?.days === p.days ? "600" : "400",
              color:
                !custom && activePreset?.days === p.days ? "var(--text)" : "var(--text2)",
              background:
                !custom && activePreset?.days === p.days
                  ? "var(--surface3)"
                  : "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={handleCustom}
          style={{
            padding: "5px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: custom ? "600" : "400",
            color: custom ? "var(--text)" : "var(--text2)",
            background: custom ? "var(--surface3)" : "transparent",
            border: "none",
            cursor: "pointer",
            transition: "all 0.15s",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Custom
        </button>
      </div>

      {custom && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            type="date"
            value={value.startDate}
            max={value.endDate}
            onChange={(e) => onChange({ ...value, startDate: e.target.value })}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--surface2)",
              color: "var(--text)",
              fontSize: "12px",
              fontFamily: "DM Sans, sans-serif",
              cursor: "pointer",
            }}
          />
          <span style={{ fontSize: "12px", color: "var(--text3)" }}>–</span>
          <input
            type="date"
            value={value.endDate}
            min={value.startDate}
            max={toDateStr(new Date())}
            onChange={(e) => onChange({ ...value, endDate: e.target.value })}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--surface2)",
              color: "var(--text)",
              fontSize: "12px",
              fontFamily: "DM Sans, sans-serif",
              cursor: "pointer",
            }}
          />
        </div>
      )}
    </div>
  );
}
